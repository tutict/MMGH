import CloseIcon from "@mui/icons-material/Close";
import { type ReactNode, useRef } from "react";
import { AppIconButton, AppModal, joinClassNames } from "../ui";

type MobileSheetProps = {
  actions?: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  eyebrow?: ReactNode;
  id?: string;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
  variant?: "sheet" | "full";
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
  variant = "sheet",
}: MobileSheetProps) {
  const portalAnchorRef = useRef<HTMLDivElement>(null);
  const isFull = variant === "full";

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
        <div className={joinClassNames("mobile-sheet-host", isFull ? "mobile-sheet-host--full" : null)}>
          <section
            id={id}
            className={joinClassNames("mobile-sheet", isFull ? "mobile-sheet--full" : null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id ? `${id}-title` : undefined}
          >
            <header className="mobile-sheet__head">
              <div className="mobile-sheet__heading">
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
              >
                <CloseIcon fontSize="small" aria-hidden="true" />
              </AppIconButton>
            </header>
            <div className="mobile-sheet__body scroll-area">{children}</div>
            {actions ? <footer className="mobile-sheet__actions">{actions}</footer> : null}
          </section>
        </div>
      </AppModal>
    </>
  );
}

export default MobileSheet;
