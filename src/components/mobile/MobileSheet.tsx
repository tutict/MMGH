import CloseIcon from "@mui/icons-material/Close";
import { type ReactNode, useRef } from "react";
import { AppIconButton, AppModal } from "../ui";

type MobileSheetProps = {
  actions?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  eyebrow?: ReactNode;
  id?: string;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
};

function MobileSheet({
  actions = null,
  children,
  closeLabel = "Close",
  eyebrow = "",
  id,
  onClose,
  open,
  title,
}: MobileSheetProps) {
  const portalAnchorRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={portalAnchorRef} className="mobile-sheet-portal-anchor" />
      <AppModal
        open={Boolean(open)}
        onClose={onClose}
        container={() =>
          (portalAnchorRef.current?.closest(".mobile-app") as HTMLElement | null) ??
          portalAnchorRef.current
        }
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
    </>
  );
}

export default MobileSheet;

