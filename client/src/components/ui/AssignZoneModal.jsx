import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { updateCollector } from '../../api/collectors';

const ZONES = ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'];

export default function AssignZoneModal({ isOpen, onClose, collector, onUpdated }) {
  const [selectedZone, setSelectedZone] = useState(collector?.zone || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !collector) return null;

  const handleSave = async () => {
    if (!selectedZone || selectedZone === collector.zone) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await updateCollector(collector._id, { zone: selectedZone });
      onUpdated?.();
      onClose();
    } catch {
      // error
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-card-border">
          <div>
            <h3 className="text-base font-bold text-gray-900">Assign Zone</h3>
            <p className="text-xs text-gray-400 mt-0.5">{collector.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Current Zone */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider mb-1">Current Zone</p>
          <p className="text-sm font-semibold text-gray-700">{collector.zone}</p>
        </div>

        {/* Zone Options */}
        <div className="px-5 py-3 space-y-2">
          <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider mb-2">Select New Zone</p>
          {ZONES.map((zone) => {
            const isSelected = selectedZone === zone;
            const isCurrent = collector.zone === zone;
            return (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-green-50 border-2 border-green-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <MapPin size={16} className={isSelected ? 'text-green-500' : 'text-gray-400'} />
                <span className={`text-sm font-medium ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                  {zone}
                </span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">Current</span>
                )}
                {isSelected && !isCurrent && (
                  <span className="ml-auto text-[10px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Selected</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-card-border">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-card-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedZone === collector.zone}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
          >
            {saving ? 'Saving...' : 'Assign Zone'}
          </button>
        </div>
      </div>
    </div>
  );
}
