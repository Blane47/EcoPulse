import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, User, Megaphone } from 'lucide-react';
import api from '../../api/axios';

const GROUPS = [
  { key: 'bins', label: 'Bins', icon: Trash2 },
  { key: 'collectors', label: 'Collectors', icon: User },
  { key: 'reports', label: 'Community reports', icon: Megaphone },
];

const describe = {
  bins: (b) => ({ title: b.binId, subtitle: `${b.location} · ${b.zone} · ${b.fillLevel}%`, to: `/bins?q=${encodeURIComponent(b.binId)}` }),
  collectors: (c) => ({ title: c.name, subtitle: [c.zone, c.phone].filter(Boolean).join(' · '), to: `/collectors/${c._id}` }),
  reports: (r) => ({ title: r.location, subtitle: [r.zone, r.status, r.reporterName].filter(Boolean).join(' · '), to: `/community-reports?report=${r._id}` }),
};

// Top-bar search across bins, collectors and community reports
export default function GlobalSearch({ className = '', autoFocus = false, onDone }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  // Debounced search; stale responses are ignored
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get('/search', { params: { q } })
        .then(({ data }) => !cancelled && setResults(data))
        .catch(() => !cancelled && setResults({ error: true }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onClick = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const items = results && !results.error
    ? GROUPS.flatMap((g) => (results[g.key] || []).map((row) => ({ group: g, ...describe[g.key](row), id: row._id })))
    : [];
  const showPanel = open && query.trim().length >= 2 && results;

  const go = (item) => {
    navigate(item.to);
    setOpen(false);
    setQuery('');
    setResults(null);
    onDone?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      onDone?.();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          if (e.target.value.trim().length < 2) setResults(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search bin ID, location or collector..."
        aria-label="Search bins, collectors and reports"
        role="combobox"
        aria-expanded={Boolean(showPanel)}
        aria-controls="global-search-results"
        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-card-border rounded-lg text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
      />

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-card-border z-50 max-h-[70vh] overflow-y-auto py-2"
        >
          {results.error ? (
            <p className="px-4 py-3 text-sm text-red-600">Search failed. Check your connection.</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No matches for “{query.trim()}”</p>
          ) : (
            GROUPS.map((g) => {
              const groupItems = items.filter((it) => it.group.key === g.key);
              if (!groupItems.length) return null;
              return (
                <div key={g.key} className="py-1">
                  <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{g.label}</p>
                  {groupItems.map((it) => {
                    const index = items.indexOf(it);
                    const Icon = g.icon;
                    return (
                      <button
                        key={it.id}
                        role="option"
                        aria-selected={index === active}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(it)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-left ${index === active ? 'bg-gray-50' : ''}`}
                      >
                        <Icon size={15} className="text-gray-400 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-gray-900 truncate">{it.title}</span>
                          <span className="block text-xs text-gray-500 truncate">{it.subtitle}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
