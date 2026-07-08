import React from "react";
import { TextField } from "@mui/material";

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type AppTextFieldProps = React.ComponentProps<typeof TextField>;

function AppTextField({ className, ...props }: AppTextFieldProps) {
  return <TextField className={joinClassNames("mui-field", className)} {...props} />;
}

export default AppTextField;
