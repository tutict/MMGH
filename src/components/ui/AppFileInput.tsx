import React from "react";
import { joinClassNames } from "./classNames";


type AppFileInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const AppFileInput = React.forwardRef<HTMLInputElement, AppFileInputProps>(function AppFileInput(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={joinClassNames("upload-input", className)} {...props} type="file" />;
});

export default AppFileInput;
