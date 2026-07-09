import React from "react";
import { Button, type ButtonProps } from "@mui/material";

type MobileButtonProps = ButtonProps & {
  type?: "button" | "submit" | "reset";
};

function MobileButton({ type = "button", ...props }: MobileButtonProps) {
  return <Button type={type} {...props} />;
}

export default MobileButton;
