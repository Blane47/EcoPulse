import { useState } from 'react';
import { X, Upload, MapPin } from 'lucide-react';
import { zones } from '../../data/mockData';

export default function AddBinModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    binName: '',
    zone: '',
    locationDescription: '',
    binType: 'Recyclable',
    lat: '',
    lng: '',
    fillLevel: 20,
    collector: '',
  });

  if (!isOpen) return null;

  const binTypes = [
    { name: 'Organic', icon: '🍂' },
    { name: 'Recyclable', icon: '♻️' },
    { name: 'General', icon: '🗑️' },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-[540px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Collection Point</h2>
              <p className="text-sm text-gray-500">Register a new waste bin in the municipal network</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Bin Name + Zone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Bin Name / Label</label>
                <input
                  type="text"
                  placeholder="BIN-249"
                  value={formData.binName}
                  onChange={(e) => handleChange('binName', e.target.value)}
                  className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Zone</label>
                <select
                  value={formData.zone}
                  onChange={(e) => handleChange('zone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">Select zone</option>
                  {zones.map((z) => <option key={z}>{z}</option>)}
                </select>
              </div>
            </div>

            {/* Location Description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Location Description</label>
              <input
                type="text"
                placeholder="Near UB Junction, Molyko"
                value={formData.locationDescription}
                onChange={(e) => handleChange('locationDescription', e.target.value)}
                className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            {/* Bin Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Bin Type</label>
              <div className="grid grid-cols-3 gap-3">
                {binTypes.map((type) => (
                  <button
                    key={type.name}
                    type="button"
                    onClick={() => handleChange('binType', type.name)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      formData.binType === type.name
                        ? 'border-accent bg-green-50'
                        : 'border-card-border hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{type.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* GPS Coordinates */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">GPS Coordinates</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={formData.lat}
                  onChange={(e) => handleChange('lat', e.target.value)}
                  className="px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={formData.lng}
                  onChange={(e) => handleChange('lng', e.target.value)}
                  className="px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <button type="button" className="flex items-center gap-1 text-accent text-xs font-medium mt-2 hover:underline">
                <MapPin size={12} />
                Use Current Location
              </button>
            </div>

            {/* Assigned Collector */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Assigned Collector</label>
              <select
                value={formData.collector}
                onChange={(e) => handleChange('collector', e.target.value)}
                className="w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Select collector</option>
                <option>Alex Rivera</option>
                <option>Emmanuel Ngwa</option>
                <option>Samuel Tabi</option>
                <option>Francis Bih</option>
                <option>Amadou Jallow</option>
                <option>Kevin Besong</option>
                <option>Abiba Lum</option>
              </select>
            </div>

            {/* Fill Level Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase">Initial Fill Level</label>
                <span className="text-sm font-semibold text-accent">{formData.fillLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.fillLevel}
                onChange={(e) => handleChange('fillLevel', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Upload Photo</label>
              <div className="border-2 border-dashed border-card-border rounded-xl p-6 flex flex-col items-center gap-2 text-gray-400 hover:border-accent/50 transition-colors cursor-pointer">
                <Upload size={24} />
                <p className="text-sm">Drag & drop or click to upload</p>
                <p className="text-xs">PNG, JPG up to 10MB</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-card-border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)' }}
              >
                Save Collection Point
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
