import { useState } from 'react';
import { X, Send, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import api from '../../api/axios';

const zones = ['all', 'Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'];
const types = [
  { value: 'info', label: 'Info', icon: Info, color: 'text-green-600 bg-green-50' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  { value: 'urgent', label: 'Urgent', icon: AlertOctagon, color: 'text-red-600 bg-red-50' },
];

export default function AnnouncementModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [zone, setZone] = useState('all');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await api.post('/announcements', { title: title.trim(), message: message.trim(), zone, type });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setTitle('');
        setMessage('');
        setZone('all');
        setType('info');
        onClose();
      }, 1500);
    } catch {}
    setSending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-card-border">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Send Announcement</h2>
            <p className="text-xs text-gray-400 mt-0.5">Broadcast a message to community members</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {sent ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Send size={28} className="text-green-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">Announcement Sent!</p>
            <p className="text-sm text-gray-400 mt-1">
              {zone === 'all' ? 'All zones' : zone} will see this notification
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Type Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Type</label>
              <div className="flex gap-2">
                {types.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                      type === t.value
                        ? `${t.color} border-current`
                        : 'text-gray-400 bg-gray-50 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Target Zone</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-4 py-2.5 border border-card-border rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {zones.map((z) => (
                  <option key={z} value={z}>{z === 'all' ? 'All Zones' : z}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Collection Rescheduled"
                className="w-full px-4 py-2.5 border border-card-border rounded-xl text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Due to heavy rain, Thursday's collection in Molyko has been moved to Friday 8:00 AM."
                rows={3}
                className="w-full px-4 py-2.5 border border-card-border rounded-xl text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!title.trim() || !message.trim() || sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
            >
              <Send size={16} />
              {sending ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
