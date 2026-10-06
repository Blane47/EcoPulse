import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Full-screen photo viewer; closes on the close button, a backdrop click or Escape
export default function PhotoLightbox({ src, alt, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    // Focus the close button while open, then hand focus back to whatever opened the viewer
    const opener = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      // The close button is the only control, so keep Tab from leaving the dialog
      if (e.key === 'Tab') {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report photo"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 pt-16"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="absolute top-3 right-3 p-2 rounded-full text-white bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
      />
    </div>
  );
}
