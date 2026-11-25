import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'owner';
  text: string;
  createdAt: any;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerAvatar?: string;
  ownerId: string;
  ownerName?: string;
  fieldId?: string;
  fieldName?: string;
  lastMessage: string;
  lastSenderId: string;
  lastSenderRole: 'customer' | 'owner';
  unreadForCustomer: number;
  unreadForOwner: number;
  updatedAt: any;
  createdAt?: any;
}

/**
 * Lấy hoặc khởi tạo cuộc hội thoại giữa khách hàng và chủ sân
 */
export async function getOrCreateConversation(params: {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  ownerId: string;
  ownerName?: string;
  fieldId?: string;
  fieldName?: string;
}): Promise<string> {
  const safeCustId = params.customerId.replace(/[\/\s]/g, '_');
  const safeOwnerId = params.ownerId.replace(/[\/\s]/g, '_');
  const convId = `${safeCustId}_${safeOwnerId}`;
  const convRef = doc(db, 'conversations', convId);
  const snap = await getDoc(convRef);

  if (!snap.exists()) {
    await setDoc(convRef, {
      customerId: params.customerId,
      customerName: params.customerName || 'Khách hàng',
      customerEmail: params.customerEmail || '',
      ownerId: params.ownerId,
      ownerName: params.ownerName || 'Chủ sân',
      fieldId: params.fieldId || '',
      fieldName: params.fieldName || '',
      lastMessage: '',
      lastSenderId: '',
      lastSenderRole: 'customer',
      unreadForCustomer: 0,
      unreadForOwner: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (params.fieldName) {
    // Cập nhật lại thông tin sân gần nhất khách đang xem
    try {
      await updateDoc(convRef, {
        fieldId: params.fieldId || '',
        fieldName: params.fieldName || '',
      });
    } catch {
      // Bỏ qua lỗi cập nhật phụ nếu có
    }
  }

  return convId;
}

/**
 * Gửi tin nhắn mới vào cuộc hội thoại
 */
export async function sendMessage(
  conversationId: string,
  message: {
    senderId: string;
    senderName: string;
    senderRole: 'customer' | 'owner';
    text: string;
  }
): Promise<void> {
  const text = message.text.trim();
  if (!text) return;

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  await addDoc(messagesRef, {
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    text,
    createdAt: serverTimestamp(),
  });

  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    lastMessage: text,
    lastSenderId: message.senderId,
    lastSenderRole: message.senderRole,
    updatedAt: serverTimestamp(),
    ...(message.senderRole === 'customer'
      ? { unreadForOwner: increment(1) }
      : { unreadForCustomer: increment(1) }),
  });
}

/**
 * Lắng nghe tin nhắn theo thời gian thực (Realtime)
 */
export function subscribeMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');

  return onSnapshot(
    messagesRef,
    (snapshot) => {
      const list: ChatMessage[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id'>),
      }));
      // Sắp xếp theo thứ tự thời gian tăng dần
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || Date.now() / 1000;
        const timeB = b.createdAt?.seconds || Date.now() / 1000;
        return timeA - timeB;
      });
      callback(list);
    },
    (err) => {
      console.error('Lỗi realtime chat messages:', err);
    }
  );
}

/**
 * Lắng nghe danh sách hội thoại của Chủ sân (Realtime)
 */
export function subscribeOwnerConversations(
  ownerId: string,
  callback: (conversations: Conversation[]) => void
): () => void {
  const convRef = collection(db, 'conversations');
  const q = query(
    convRef,
    where('ownerId', '==', ownerId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Conversation[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Conversation, 'id'>),
      }));
      // Sắp xếp theo cập nhật mới nhất lên đầu mà không cần tạo composite index thủ công
      list.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (err) => {
      console.error('Lỗi realtime owner conversations:', err);
    }
  );
}

/**
 * Lắng nghe danh sách hội thoại của Khách hàng (Realtime)
 */
export function subscribeCustomerConversations(
  customerIds: string | string[],
  callback: (conversations: Conversation[]) => void
): () => void {
  const ids = (Array.isArray(customerIds) ? customerIds : [customerIds]).filter(Boolean);
  if (ids.length === 0) {
    callback([]);
    return () => {};
  }

  const convRef = collection(db, 'conversations');
  const q = ids.length === 1
    ? query(convRef, where('customerId', '==', ids[0]))
    : query(convRef, where('customerId', 'in', ids.slice(0, 10)));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Conversation[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Conversation, 'id'>),
      }));
      // Sắp xếp theo cập nhật mới nhất lên đầu
      list.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (err) => {
      console.error('Lỗi realtime customer conversations:', err);
    }
  );
}

/**
 * Lắng nghe toàn bộ cuộc hội thoại liên quan đến người dùng (cả tư cách Khách hàng và Chủ sân)
 */
export function subscribeUserConversations(
  identifiers: string | string[],
  callback: (conversations: Conversation[]) => void
): () => void {
  const ids = (Array.isArray(identifiers) ? identifiers : [identifiers]).filter(Boolean);
  if (ids.length === 0) {
    callback([]);
    return () => {};
  }

  const convRef = collection(db, 'conversations');
  const convMap = new Map<string, Conversation>();

  const notify = () => {
    const list = Array.from(convMap.values());
    list.sort((a, b) => {
      const timeA = a.updatedAt?.seconds || 0;
      const timeB = b.updatedAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(list);
  };

  const targetIds = ids.slice(0, 10);
  const qCustomer = targetIds.length === 1
    ? query(convRef, where('customerId', '==', targetIds[0]))
    : query(convRef, where('customerId', 'in', targetIds));

  const qOwner = targetIds.length === 1
    ? query(convRef, where('ownerId', '==', targetIds[0]))
    : query(convRef, where('ownerId', 'in', targetIds));

  const unsubCustomer = onSnapshot(
    qCustomer,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          convMap.delete(change.doc.id);
        } else {
          convMap.set(change.doc.id, {
            id: change.doc.id,
            ...(change.doc.data() as Omit<Conversation, 'id'>),
          });
        }
      });
      notify();
    },
    (err) => console.error('Lỗi sub customer conv:', err)
  );

  const unsubOwner = onSnapshot(
    qOwner,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          convMap.delete(change.doc.id);
        } else {
          convMap.set(change.doc.id, {
            id: change.doc.id,
            ...(change.doc.data() as Omit<Conversation, 'id'>),
          });
        }
      });
      notify();
    },
    (err) => console.error('Lỗi sub owner conv:', err)
  );

  return () => {
    unsubCustomer();
    unsubOwner();
  };
}

/**
 * Đánh dấu tin nhắn đã đọc
 */
export async function markConversationAsRead(
  conversationId: string,
  role: 'customer' | 'owner'
): Promise<void> {
  const convRef = doc(db, 'conversations', conversationId);
  try {
    await updateDoc(convRef, {
      ...(role === 'customer' ? { unreadForCustomer: 0 } : { unreadForOwner: 0 }),
    });
  } catch (err) {
    console.error('Lỗi đánh dấu đã đọc:', err);
  }
}
