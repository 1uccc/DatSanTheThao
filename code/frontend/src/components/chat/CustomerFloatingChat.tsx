import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { auth } from '../../config/firebase';
import {
  Conversation,
  ChatMessage,
  subscribeUserConversations,
  subscribeMessages,
  sendMessage,
  markConversationAsRead,
  getOrCreateConversation,
} from '../../services/chatService';

const QUICK_QUESTIONS_CUSTOMER = [
  'Sân còn trống khung giờ tối nay không ạ?',
  'Sân có cho thuê dụng cụ / bóng không anh/chị?',
  'Giá đặt sân có áp dụng khuyến mãi gì không ạ?',
];

const QUICK_QUESTIONS_OWNER = [
  'Dạ sân vẫn còn trống khung giờ đó anh/chị nhé!',
  'Dạ bên em có đầy đủ bóng, vợt và phòng thay đồ ạ.',
  'Anh/chị vui lòng bấm "Đặt Sân Ngay" trên web để giữ lịch nhé ạ!',
];

function SmileyChatIcon({ className = 'w-8 h-8 sm:w-9 sm:h-9', eyeColor = '#16a34a' }: { className?: string; eyeColor?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Khung bong bóng chat màu trắng */}
      <path
        d="M18 14H46C49.3137 14 52 16.6863 52 20V34C52 37.3137 49.3137 40 46 40H34V49L24 40H18C14.6863 40 12 37.3137 12 34V20C12 16.6863 14.6863 14 18 14Z"
        fill="white"
      />
      {/* Mắt tròn màu xanh */}
      <circle cx="26" cy="26" r="2.6" fill={eyeColor} />
      <circle cx="38" cy="26" r="2.6" fill={eyeColor} />
      {/* Nụ cười vui vẻ màu xanh */}
      <path
        d="M25 31.5C26.5 35 29.5 36.5 32 36.5C34.5 36.5 37.5 35 39 31.5"
        stroke={eyeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CustomerFloatingChat() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Thông tin phiên người dùng
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sportbook-session') || 'null');
    } catch {
      return null;
    }
  });

  const [authUid, setAuthUid] = useState<string>(() => auth.currentUser?.uid || session?.uid || session?.id || '');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthUid(user.uid);
        try {
          const s = JSON.parse(localStorage.getItem('sportbook-session') || '{}');
          if (s && !s.uid) {
            s.uid = user.uid;
            localStorage.setItem('sportbook-session', JSON.stringify(s));
            setSession(s);
          }
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  const customerId = authUid || auth.currentUser?.uid || session?.uid || session?.id || session?.email || '';
  const customerName = session?.name || auth.currentUser?.displayName || 'Khách hàng';
  const customerEmail = session?.email || auth.currentUser?.email || '';
  const isLoggedIn = !!(customerId || session?.email || session?.name);
  const isOwnerRole = session?.role === 'owner';

  // Hàm xác định đối phương trong cuộc hội thoại (Chủ sân hay Khách hàng)
  const getOtherUser = (c: Conversation) => {
    const myIdentifiers = [customerId, session?.email, session?.uid].filter(Boolean);
    const isMeOwner = myIdentifiers.includes(c.ownerId);

    if (isMeOwner) {
      return {
        name: c.customerName || 'Khách hàng',
        sub: c.fieldName ? `Sân: ${c.fieldName}` : 'Khách hàng liên hệ',
        avatarChar: c.customerName ? c.customerName.charAt(0).toUpperCase() : 'K',
        unreadCount: c.unreadForOwner || 0,
        myRole: 'owner' as const,
        otherRoleLabel: 'Khách hàng',
      };
    } else {
      return {
        name: c.ownerName || 'Chủ sân',
        sub: c.fieldName ? `Sân: ${c.fieldName}` : 'Chủ sân phản hồi',
        avatarChar: c.ownerName ? c.ownerName.charAt(0).toUpperCase() : 'S',
        unreadCount: c.unreadForCustomer || 0,
        myRole: 'customer' as const,
        otherRoleLabel: 'Chủ sân',
      };
    }
  };

  // Lắng nghe toàn bộ danh sách hội thoại của người dùng (kể cả vai trò Chủ sân hay Khách hàng)
  useEffect(() => {
    if (!customerId) {
      setConversations([]);
      return;
    }

    setLoadingConv(true);
    const searchIds = [customerId, session?.email, session?.uid].filter(Boolean) as string[];
    const unsubscribe = subscribeUserConversations(searchIds, (list) => {
      setConversations(list);
      setLoadingConv(false);

      // Cập nhật lại cuộc hội thoại đang mở nếu có thay đổi
      if (activeConv) {
        const updated = list.find((c) => c.id === activeConv.id);
        if (updated) setActiveConv(updated);
      }
    });

    return () => unsubscribe();
  }, [customerId, session?.email, session?.uid]);

  // Lắng nghe tin nhắn của cuộc trò chuyện đang chọn
  useEffect(() => {
    if (!activeConv?.id) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const other = getOtherUser(activeConv);
    markConversationAsRead(activeConv.id, other.myRole);

    const unsubscribe = subscribeMessages(activeConv.id, (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeConv?.id]);

  // Lắng nghe sự kiện mở chat từ nút "Nhắn tin với chủ sân" ở trang chi tiết sân
  useEffect(() => {
    const handleOpenChat = async (e: Event) => {
      const customEvent = e as CustomEvent<{
        ownerId: string;
        ownerName?: string;
        fieldId?: string;
        fieldName?: string;
      }>;
      const data = customEvent.detail;
      if (!data?.ownerId) return;

      setIsOpen(true);

      if (!customerId) return;

      try {
        const convId = await getOrCreateConversation({
          customerId,
          customerName,
          customerEmail,
          ownerId: data.ownerId,
          ownerName: data.ownerName || 'Chủ sân',
          fieldId: data.fieldId || '',
          fieldName: data.fieldName || '',
        });

        // Tìm hoặc tạo object active conversation
        const found = conversations.find((c) => c.id === convId);
        if (found) {
          setActiveConv(found);
        } else {
          setActiveConv({
            id: convId,
            customerId,
            customerName,
            customerEmail,
            ownerId: data.ownerId,
            ownerName: data.ownerName || 'Chủ sân',
            fieldId: data.fieldId || '',
            fieldName: data.fieldName || '',
            lastMessage: '',
            lastSenderId: '',
            lastSenderRole: 'customer',
            unreadForCustomer: 0,
            unreadForOwner: 0,
            updatedAt: null,
          });
        }
      } catch (err) {
        console.error('Lỗi mở cuộc trò chuyện:', err);
      }
    };

    window.addEventListener('open-customer-chat', handleOpenChat);
    return () => window.removeEventListener('open-customer-chat', handleOpenChat);
  }, [customerId, customerName, customerEmail, conversations]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Tổng số tin nhắn chưa đọc tính theo vai trò tương ứng của mỗi cuộc hội thoại
  const totalUnread = conversations.reduce((sum, c) => {
    return sum + getOtherUser(c).unreadCount;
  }, 0);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeConv?.id || sending) return;

    setSending(true);
    setInputText('');

    try {
      const other = getOtherUser(activeConv);
      await sendMessage(activeConv.id, {
        senderId: customerId,
        senderName: session?.name || (other.myRole === 'owner' ? 'Chủ sân' : 'Khách hàng'),
        senderRole: other.myRole,
        text,
      });
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const other = getOtherUser(c);
    return (
      other.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.fieldName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <>
      {/* Floating Action Button ở góc phải dưới màn hình - Hình tròn màu xanh chuẩn mẫu ảnh */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-green-600 via-emerald-600 to-green-500 hover:from-green-700 hover:to-emerald-700 text-white shadow-2xl shadow-green-950/30 hover:shadow-green-950/45 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center group cursor-pointer border-2 border-white/20"
          title={isOwnerRole ? 'Tin nhắn từ khách hàng' : 'Tin nhắn & Lịch sử chat'}
          aria-label="Tin nhắn & Lịch sử chat"
        >
          <div className="relative flex items-center justify-center">
            <SmileyChatIcon className="w-8 h-8 sm:w-9 sm:h-9 transform group-hover:scale-105 transition-transform drop-shadow-xs" />
            {totalUnread > 0 && (
              <span className="absolute -top-3 -right-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white ring-2 ring-white animate-pulse">
                {totalUnread}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Floating Chat Popup Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] max-w-[calc(100vw-24px)] h-[560px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-700 to-emerald-600 px-4 py-3.5 text-white flex items-center justify-between shadow-xs">
            {activeConv ? (
              /* Header khi đang mở cuộc chat cụ thể */
              (() => {
                const other = getOtherUser(activeConv);
                return (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActiveConv(null)}
                      className="p-1 -ml-1 text-green-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Quay lại danh sách lịch sử"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                      {other.avatarChar}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{other.name}</div>
                      <div className="text-[11px] text-green-100 truncate">
                        {other.sub}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* Header khi đang ở danh sách lịch sử */
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <SmileyChatIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {isOwnerRole ? 'Tin Nhắn Khách Hàng' : 'Hộp Thư & Lịch Sử Chat'}
                  </h3>
                  <p className="text-[11px] text-green-100">
                    {conversations.length > 0
                      ? `${conversations.length} cuộc hội thoại`
                      : isOwnerRole
                      ? 'Trao đổi với khách hàng'
                      : 'Trò chuyện với các chủ sân'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-green-100 hover:text-white hover:bg-white/10 transition-colors"
                title="Thu nhỏ"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          {!isLoggedIn ? (
            /* Yêu cầu đăng nhập */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 text-3xl">
                💬
              </div>
              <h4 className="font-bold text-gray-800 text-base mb-1">Đăng nhập để xem tin nhắn</h4>
              <p className="text-xs text-gray-500 mb-6 max-w-xs">
                Bạn cần đăng nhập tài khoản để nhắn tin và theo dõi phản hồi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/auth');
                }}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : activeConv ? (
            /* VIEW CHI TIẾT TIN NHẮN */
            (() => {
              const other = getOtherUser(activeConv);
              const quickQuestions = other.myRole === 'owner' ? QUICK_QUESTIONS_OWNER : QUICK_QUESTIONS_CUSTOMER;

              return (
                <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-32 text-gray-400 text-xs">
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Đang tải tin nhắn...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <div className="text-3xl mb-2">👋</div>
                        <p className="text-xs font-semibold text-gray-700">
                          Bắt đầu trò chuyện với {other.name}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-[250px] mx-auto">
                          {other.myRole === 'owner'
                            ? 'Gửi phản hồi nhanh cho khách hàng về lịch đặt sân.'
                            : 'Hỏi về tình trạng sân, khung giờ còn trống hoặc dụng cụ thuê.'}
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.senderRole === other.myRole;
                        return (
                          <div
                            key={m.id || Math.random()}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                                isMe
                                  ? 'bg-green-600 text-white rounded-br-xs'
                                  : 'bg-white text-gray-800 border border-gray-200/90 rounded-bl-xs'
                              }`}
                            >
                              {m.text}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                              {m.createdAt?.seconds
                                ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Vừa xong'}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Gợi ý câu trả lời nhanh */}
                  {messages.length < 3 && (
                    <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-1.5 overflow-x-auto">
                      {quickQuestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleSend(q)}
                          className="text-[11px] text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full px-2.5 py-1 text-left transition-colors whitespace-nowrap"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ô nhập tin nhắn */}
                  <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={other.myRole === 'owner' ? 'Nhập phản hồi cho khách...' : 'Nhập tin nhắn...'}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={!inputText.trim() || sending}
                      className="p-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors shrink-0"
                      title="Gửi"
                    >
                      <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            /* VIEW DANH SÁCH LỊCH SỬ HỘI THOẠI */
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Ô tìm kiếm */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <svg
                    className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isOwnerRole ? 'Tìm khách hàng hoặc sân...' : 'Tìm tên chủ sân hoặc tên sân...'}
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 focus:bg-white rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                </div>
              </div>

              {/* Danh sách */}
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {loadingConv ? (
                  <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Đang tải danh sách tin nhắn...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 flex items-center justify-center mb-3 shadow-md shadow-green-900/15">
                      <SmileyChatIcon className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700">
                      {isOwnerRole ? 'Chưa có tin nhắn nào từ khách hàng' : 'Chưa có lịch sử trò chuyện'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-[240px]">
                      {isOwnerRole
                        ? 'Khi khách hàng gửi tin nhắn hỏi về sân của bạn, cuộc trò chuyện sẽ hiện ở đây.'
                        : 'Vào bất kỳ trang chi tiết sân nào và bấm nút "Nhắn tin với chủ sân" để bắt đầu.'}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((c) => {
                    const other = getOtherUser(c);
                    const hasUnread = other.unreadCount > 0;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveConv(c)}
                        className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                          hasUnread ? 'bg-green-50/40 hover:bg-green-50/70' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            {other.avatarChar}
                          </div>
                          {hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className={`text-xs truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                              {other.name}
                            </h4>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {c.updatedAt?.seconds
                                ? new Date(c.updatedAt.seconds * 1000).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>
                          {c.fieldName && (
                            <div className="text-[11px] text-green-700 font-medium truncate mt-0.5">
                              🏟️ {c.fieldName}
                            </div>
                          )}
                          <p className={`text-xs truncate mt-1 ${hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                            {c.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
