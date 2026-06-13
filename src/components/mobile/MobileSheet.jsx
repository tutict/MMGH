import React from "react";

function MobileSheet({
  actions = null,
  children,
  closeLabel = "Close",
  eyebrow = "",
  id,
  onClose,
  open,
  title,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="mobile-sheet-host">
      <button
        type="button"
        className="mobile-sheet__backdrop"
        onClick={onClose}
        aria-label={closeLabel}
      />
      <section
        id={id}
        className="mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id ? `${id}-title` : undefined}
      >
        <header className="mobile-sheet__head">
          <div>
            {eyebrow ? <span className="mobile-eyebrow">{eyebrow}</span> : null}
            <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
          </div>
          <button type="button" className="mobile-icon-button" onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span className="sr-only">{closeLabel}</span>
          </button>
        </header>
        <div className="mobile-sheet__body">{children}</div>
        {actions ? <footer className="mobile-sheet__actions">{actions}</footer> : null}
      </section>
    </div>
  );
}

export default MobileSheet;
