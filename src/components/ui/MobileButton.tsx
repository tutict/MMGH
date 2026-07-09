import React from "react";
import { Button, type ButtonProps } from "@mui/material";
import { joinClassNames } from "./classNames";

type MobileButtonProps = ButtonProps & {
  mobileAction?: "primary" | "secondary" | "danger";
  type?: "button" | "submit" | "reset";
};

function MobileButton({ mobileAction, className, type = "button", ...props }: MobileButtonProps) {
  return (
    <Button
      className={joinClassNames(mobileAction ? `mobile-${mobileAction}-action` : null, className)}
      type={type}
      {...props}
    />
  );
}

export default MobileButton;
