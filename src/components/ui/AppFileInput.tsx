import React from "react";

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type AppFileInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const AppFileInput = React.forwardRef<HTMLInputElement, AppFileInputProps>(function AppFileInput(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={joinClassNames("upload-input", className)} {...props} type="file" />;
});

export default AppFileInput;
