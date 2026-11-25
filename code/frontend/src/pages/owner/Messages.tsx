import { useState, useEffect, useRef } from 'react';
import { auth } from '../../config/firebase';
import {
  Conversation,
  ChatMessage,
  subscribeOwnerConversations,
  subscribeMessages,
  sendMessage,
  markConversationAsRead,
} from '../../services/chatService';

const OWNER_QUICK_REPLIES = [
  'Dạ sân vẫn còn trống khung giờ đó anh/chị nhé!',
  'Dạ bên em có đầy đủ bóng, vợt và phòng thay đồ ạ.',
  'Anh/chị vui lòng bấm "Đặt Sân Ngay" trên web để giữ lịch nhé ạ!',
  'Dạ cảm ơn anh/chị đã quan tâm đến sân bên em!',
];

export function OwnerMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lấy thông tin tài khoản chủ sân
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

  const ownerId = authUid || auth.currentUser?.uid || session?.uid || session?.id || session?.email || '';
  const ownerName = session?.name || auth.currentUser?.displayName || 'Chủ sân';

  // Lắng nghe danh sách hội thoại của chủ sân
  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeOwnerConversations(ownerId, (list) => {
      setConversations(list);
      setLoading(false);

      // Nếu đang mở một hội thoại, cập nhật lại thông tin mới nhất của hội thoại đó
      if (selectedConv) {
        const updated = list.find((c) => c.id === selectedConv.id);
        if (updated) setSelectedConv(updated);
      }
    });

    return () => unsubscribe();
  }, [ownerId]);

  // Lắng nghe tin nhắn của cuộc hội thoại đang chọn
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }

    markConversationAsRead(selectedConv.id, 'owner');

    const unsubscribe = subscribeMessages(selectedConv.id, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedConv?.id]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    markConversationAsRead(conv.id, 'owner');
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedConv || sending) return;

    setSending(true);
    setInputText('');

    try {
      await sendMessage(selectedConv.id, {
        senderId: ownerId,
        senderName: ownerName,
        senderRole: 'owner',
        text,
      });
    } catch (err) {
      console.error('Lỗi chủ sân gửi tin nhắn:', err);
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

  const filteredConversations = conversations.filter(
    (c) =>
      c.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.fieldName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif' }} className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight">
          Tin Nhắn Khách Hàng
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Trao đổi trực tiếp theo thời gian thực và hỗ trợ khách hàng đặt sân
        </p>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden flex h-[680px]">
        {/* Left Column: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col shrink-0 ${
            selectedConv ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
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
                placeholder="Tìm khách hàng hoặc sân..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 hover:bg-gray-100/80 focus:bg-white rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải tin nhắn...</span>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-xs font-semibold text-gray-600">Chưa có tin nhắn nào</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Khi khách hàng bấm nhắn tin trên trang chi tiết sân, cuộc trò chuyện sẽ hiện ở đây.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedConv?.id === c.id;
                const hasUnread = (c.unreadForOwner || 0) > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c)}
                    className={`p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-green-50/70 border-r-4 border-green-600'
                        : hasUnread
                        ? 'bg-emerald-50/30 hover:bg-gray-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {c.customerName ? c.customerName.charAt(0).toUpperCase() : 'K'}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                          {c.customerName}
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
                        <div className="text-[11px] font-medium text-green-700 truncate mt-0.5">
                          🏟️ {c.fieldName}
                        </div>
                      )}
                      <p className={`text-xs truncate mt-1 ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                        {c.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat History & Input */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/40 ${
            !selectedConv ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedConv(null)}
                    className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                    title="Quay lại danh sách"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {selectedConv.customerName ? selectedConv.customerName.charAt(0).toUpperCase() : 'K'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">
                      {selectedConv.customerName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {selectedConv.customerEmail && (
                        <span className="truncate">{selectedConv.customerEmail}</span>
                      )}
                      {selectedConv.fieldName && (
                        <span className="text-green-700 font-medium truncate">
                          • Sân: {selectedConv.fieldName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                    <div className="text-4xl mb-2">👋</div>
                    <p className="text-xs font-semibold text-gray-700">Chưa có tin nhắn nào</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm">
                      Hãy gửi lời chào hoặc phản hồi lại khách hàng để bắt đầu cuộc trò chuyện.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderRole === 'owner';
                    return (
                      <div
                        key={m.id || Math.random()}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
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

              {/* Quick Reply Chips */}
              <div className="px-4 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-semibold text-gray-400 self-center mr-1">Gợi ý nhanh:</span>
                {OWNER_QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => handleSend(reply)}
                    className="text-[11px] text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full px-2.5 py-1 text-left transition-colors whitespace-nowrap"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-200 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập câu trả lời cho khách hàng..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || sending}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <span>Gửi</span>
                  <svg className="w-3.5 h-3.5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 text-3xl">
                💬
              </div>
              <h3 className="font-bold text-gray-800 text-base mb-1">Tin Nhắn Trực Tuyến</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Chọn một khách hàng ở danh sách bên trái để xem lịch sử trò chuyện và phản hồi thắc mắc đặt sân.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
