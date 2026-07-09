import React from "react";
import { MenuItem } from "@mui/material";

type AppMenuItemProps = React.ComponentProps<typeof MenuItem>;

function AppMenuItem(props: AppMenuItemProps) {
  return <MenuItem {...props} />;
}

export default AppMenuItem;
