import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, ArrowLeft, Circle } from 'lucide-react';
import api from '../api/axios';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch chat list
  const fetchChats = useCallback(async () => {
    try {
      const { data } = await api.get('/chat');
      setChats(data);
    } catch {}
  }, []);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;
    try {
      const { data } = await api.get(`/chat/${selectedChat}`);
      setMessages(data);
      await api.put(`/chat/${selectedChat}/read`).catch(() => {});
    } catch {}
  }, [selectedChat]);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 2000);
    return () => clearInterval(interval);
  }, [fetchChats]);

  useEffect(() => {
    if (!selectedChat) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [selectedChat, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');
    try {
      const { data } = await api.post('/chat', { chatId: selectedChat, text: trimmed });
      setMessages((prev) => [...prev, data]);
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const totalUnread = chats.reduce((sum, c) => sum + (c.unread || 0), 0);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Chat List */}
      <div className={`w-80 border-r border-gray-100 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'} ${!selectedChat ? 'flex-1 md:flex-none' : ''}`}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            {totalUnread > 0 && (
              <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Collector conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
              <MessageSquare size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-xs mt-1">Collectors will appear here when they message</p>
            </div>
          ) : (
            chats.map((chat) => (
              <button
                key={chat._id}
                onClick={() => setSelectedChat(chat._id)}
                className={`w-full text-left px-5 py-4 flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedChat === chat._id ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 text-sm font-bold">
                      {chat.senderName?.split(' ').map((n) => n[0]).join('') || '?'}
                    </span>
                  </div>
                  {chat.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-900 truncate">{chat.senderName || 'Collector'}</p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{timeAgo(chat.updatedAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{chat.lastMessage}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm font-bold">
                  {chats.find((c) => c._id === selectedChat)?.senderName?.split(' ').map((n) => n[0]).join('') || '?'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {chats.find((c) => c._id === selectedChat)?.senderName || 'Collector'}
                </p>
                <div className="flex items-center gap-1">
                  <Circle size={6} className="fill-green-500 text-green-500" />
                  <span className="text-[10px] text-gray-400">Online</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/50">
              {messages.map((msg) => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isAdmin
                          ? 'bg-green-500 text-white rounded-br-sm'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${isAdmin ? 'text-green-100' : 'text-gray-400'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex items-end gap-3 px-5 py-4 border-t border-gray-100 bg-white">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-200 transition-all"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={56} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-500">Select a conversation</p>
            <p className="text-sm mt-1">Choose a collector from the list to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
