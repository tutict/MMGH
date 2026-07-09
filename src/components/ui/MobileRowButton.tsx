import React from "react";
import type { ButtonProps } from "@mui/material";

import { joinClassNames } from "./classNames";
import MobileButton from "./MobileButton";

type MobileRowButtonVariant = "cache";

type MobileRowButtonProps = ButtonProps & {
  active?: boolean;
  rowVariant?: MobileRowButtonVariant;
  type?: "button" | "submit" | "reset";
};

function MobileRowButton({ active, children, className, rowVariant, type = "button", variant = "text", ...props }: MobileRowButtonProps) {
  return (
    <MobileButton
      className={joinClassNames(
        "mobile-row",
        rowVariant ? `mobile-${rowVariant}-row` : null,
        active ? "is-active" : null,
        className
      )}
      type={type}
      variant={variant}
      {...props}
    >
      {children}
    </MobileButton>
  );
}

export default MobileRowButton;
