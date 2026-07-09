import CloseIcon from "@mui/icons-material/Close";
import { AppIconButton, AppModal } from "../ui";

function MobileSheet({
  actions = null,
  children,
  closeLabel = "Close",
  eyebrow = "",
  id,
  onClose,
  open,
  title,
}: Record<string, any>) {
  return (
    <AppModal
      open={Boolean(open)}
      onClose={onClose}
      aria-labelledby={id ? `${id}-title` : undefined}
      closeAfterTransition={false}
      slotProps={{
        backdrop: {
          className: "mobile-sheet__backdrop",
        },
      }}
    >
      <div className="mobile-sheet-host">
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
              <h2 id={id ? `${id}-title` : undefined}>
                {title}
              </h2>
            </div>
            <AppIconButton
              type="button"
              className="mobile-icon-button"
              onClick={onClose}
              aria-label={closeLabel}
              size="small"
            >
              <CloseIcon fontSize="small" aria-hidden="true" />
            </AppIconButton>
          </header>
          <div className="mobile-sheet__body">{children}</div>
          {actions ? <footer className="mobile-sheet__actions">{actions}</footer> : null}
        </section>
      </div>
    </AppModal>
  );
}

export default MobileSheet;

