import React from "react";
import { TextField } from "@mui/material";

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type AppTextFieldProps = React.ComponentProps<typeof TextField> & {
  fieldClassName?: string;
};

function AppTextField({ className, fieldClassName = "mui-field", ...props }: AppTextFieldProps) {
  return <TextField className={joinClassNames(fieldClassName, className)} {...props} />;
}

export default AppTextField;
