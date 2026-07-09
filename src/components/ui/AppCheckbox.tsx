import React from "react";
import { Checkbox } from "@mui/material";

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type AppCheckboxProps = React.ComponentProps<typeof Checkbox>;

function AppCheckbox({ className, ...props }: AppCheckboxProps) {
  return <Checkbox className={joinClassNames("mui-checkbox", className)} {...props} />;
}

export default AppCheckbox;
