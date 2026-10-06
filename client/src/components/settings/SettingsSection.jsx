export const inputClass =
  'w-full px-3 py-2.5 border border-card-border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent';

export function Section({ icon, title, description, children }) {
  const Icon = icon;
  return (
    <section className="bg-white rounded-card border border-card-border p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-green-50 text-accent flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function Message({ message }) {
  if (!message) return null;
  return (
    <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`} role="status">
      {message.text}
    </p>
  );
}
