import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { auth } from '../../config/firebase';
import {
  ChatMessage,
  getOrCreateConversation,
  sendMessage,
  subscribeMessages,
  markConversationAsRead,
} from '../../services/chatService';

interface CustomerChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  ownerName?: string;
  fieldId?: string;
  fieldName?: string;
}

const QUICK_QUESTIONS = [
  'Sân còn trống khung giờ tối nay không ạ?',
  'Sân có cho thuê dụng cụ / bóng không anh/chị?',
  'Giá đặt sân có áp dụng khuyến mãi gì không ạ?',
];

export function CustomerChatWidget({
  isOpen,
  onClose,
  ownerId,
  ownerName = 'Chủ sân',
  fieldId = '',
  fieldName = '',
}: CustomerChatWidgetProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lấy phiên đăng nhập hiện tại của khách
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
        } catch {
          // ignore
        }
      }
    });
    return () => unsub();
  }, []);

  const customerId = authUid || auth.currentUser?.uid || session?.uid || session?.id || session?.email || '';
  const customerName = session?.name || auth.currentUser?.displayName || 'Khách hàng';
  const customerEmail = session?.email || auth.currentUser?.email || '';
  const isLoggedIn = !!(customerId || session?.email || session?.name);

  // Khởi tạo hoặc lấy cuộc hội thoại
  useEffect(() => {
    if (!isOpen || !customerId || !ownerId) return;

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    getOrCreateConversation({
      customerId,
      customerName,
      customerEmail,
      ownerId,
      ownerName,
      fieldId,
      fieldName,
    })
      .then((convId) => {
        setConversationId(convId);
        markConversationAsRead(convId, 'customer');

        unsubscribe = subscribeMessages(convId, (msgs) => {
          setMessages(msgs);
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error('Lỗi kết nối chat:', err);
        setLoading(false);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, customerId, ownerId, fieldName]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !conversationId || sending) return;

    setSending(true);
    setInputText('');

    try {
      await sendMessage(conversationId, {
        senderId: customerId,
        senderName: customerName,
        senderRole: 'customer',
        text,
      });
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      setInputText(text); // khôi phục lại nếu lỗi
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

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] sm:w-[400px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[520px] transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 px-4 py-3 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
              🏟️
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-green-700 rounded-full" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{ownerName}</div>
            <div className="text-xs text-green-100 truncate">
              {fieldName ? `Hỏi về: ${fieldName}` : 'Phản hồi nhanh'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-green-100 hover:text-white hover:bg-white/10 transition-colors"
            title="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {!isLoggedIn ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 text-2xl">
            💬
          </div>
          <h4 className="font-bold text-gray-800 text-base mb-1">Đăng nhập để trò chuyện</h4>
          <p className="text-xs text-gray-500 mb-6 max-w-xs">
            Bạn cần đăng nhập tài khoản để gửi tin nhắn và nhận phản hồi trực tiếp từ chủ sân.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/auth');
            }}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            Đăng nhập ngay
          </button>
        </div>
      ) : loading || !customerId ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            <span>Đang kết nối tin nhắn...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Danh sách tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <div className="text-3xl mb-2">👋</div>
                <p className="text-xs font-medium text-gray-600">Bắt đầu trò chuyện với chủ sân</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[240px] mx-auto">
                  Bạn có thể hỏi về tình trạng sân, đặt lịch cố định, đặt tiệc hoặc thuê dụng cụ.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderRole === 'customer';
                return (
                  <div
                    key={m.id || Math.random()}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                        isMe
                          ? 'bg-green-600 text-white rounded-br-xs'
                          : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs'
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

          {/* Gợi ý câu hỏi nhanh nếu ít hơn 2 tin nhắn */}
          {messages.length < 2 && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-1.5 overflow-x-auto">
              {QUICK_QUESTIONS.map((q) => (
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
              placeholder="Nhập tin nhắn với chủ sân..."
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
        </>
      )}
    </div>
  );
}
