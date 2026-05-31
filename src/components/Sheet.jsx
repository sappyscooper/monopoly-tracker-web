import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sheet({ open, title, subtitle, children, onClose, className = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-root"
          data-modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button className="sheet-backdrop" aria-label="Close sheet" onClick={onClose} />
          <motion.section
            className={`sheet-panel ${className}`}
            data-sheet
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
          >
            {(title || subtitle) && (
              <header className="sheet-heading">
                {title && <h2 id="sheet-title">{title}</h2>}
                {subtitle && <p>{subtitle}</p>}
              </header>
            )}
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
