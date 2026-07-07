import CloseIcon from "@mui/icons-material/Close";
import { Box, IconButton, Modal, Typography } from "@mui/material";

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
    <Modal
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
      <Box className="mobile-sheet-host">
        <Box
          component="section"
          id={id}
          className="mobile-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={id ? `${id}-title` : undefined}
        >
          <Box component="header" className="mobile-sheet__head">
            <Box>
              {eyebrow ? <span className="mobile-eyebrow">{eyebrow}</span> : null}
              <Typography component="h2" id={id ? `${id}-title` : undefined}>
                {title}
              </Typography>
            </Box>
            <IconButton
              type="button"
              className="mobile-icon-button"
              onClick={onClose}
              aria-label={closeLabel}
              size="small"
            >
              <CloseIcon fontSize="small" aria-hidden="true" />
            </IconButton>
          </Box>
          <Box className="mobile-sheet__body">{children}</Box>
          {actions ? <Box component="footer" className="mobile-sheet__actions">{actions}</Box> : null}
        </Box>
      </Box>
    </Modal>
  );
}

export default MobileSheet;

