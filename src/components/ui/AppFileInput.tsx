import React from "react";
import { joinClassNames } from "./classNames";


type AppFileInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const AppFileInput = React.forwardRef<HTMLInputElement, AppFileInputProps>(function AppFileInput(
  { className, ...props },
  ref
) {
  // The visible button owns the action, so the input stays out of the tab order
  // and out of the accessibility tree.
  return (
    <input
      ref={ref}
      className={joinClassNames("upload-input", className)}
      {...props}
      type="file"
      tabIndex={-1}
      aria-hidden="true"
    />
  );
});

export default AppFileInput;
