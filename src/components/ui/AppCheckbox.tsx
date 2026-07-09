import React from "react";
import { joinClassNames } from "./classNames";
import { Checkbox } from "@mui/material";


type AppCheckboxProps = React.ComponentProps<typeof Checkbox>;

function AppCheckbox({ className, ...props }: AppCheckboxProps) {
  return <Checkbox className={joinClassNames("mui-checkbox", className)} {...props} />;
}

export default AppCheckbox;
