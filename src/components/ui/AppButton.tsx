import React from "react";
import { ButtonBase, type ButtonBaseProps } from "@mui/material";

type AppButtonProps = Omit<ButtonBaseProps, "component"> & {
  type?: "button" | "submit" | "reset";
};

function AppButton({ type = "button", ...props }: AppButtonProps) {
  return <ButtonBase component="button" type={type} {...props} />;
}

export default AppButton;
