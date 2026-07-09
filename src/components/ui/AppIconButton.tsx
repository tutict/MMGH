import React from "react";
import { IconButton, type IconButtonProps } from "@mui/material";

type AppIconButtonProps = IconButtonProps;

function AppIconButton(props: AppIconButtonProps) {
  return <IconButton {...props} />;
}

export default AppIconButton;
