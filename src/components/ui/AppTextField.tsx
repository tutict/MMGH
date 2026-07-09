import React from "react";
import { joinClassNames } from "./classNames";
import { TextField } from "@mui/material";


type AppTextFieldProps = React.ComponentProps<typeof TextField> & {
  fieldClassName?: string;
};

function AppTextField({ className, fieldClassName = "mui-field", ...props }: AppTextFieldProps) {
  return <TextField className={joinClassNames(fieldClassName, className)} {...props} />;
}

export default AppTextField;
