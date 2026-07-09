import React from "react";
import AppIconButton from "./AppIconButton";
import { joinClassNames } from "./classNames";

type MobileCheckButtonProps = React.ComponentProps<typeof AppIconButton> & {
  checked?: boolean;
};

function MobileCheckButton({ checked = false, className, children, ...props }: MobileCheckButtonProps) {
  return (
    <AppIconButton className={joinClassNames("mobile-check", checked ? "is-done" : null, className)} {...props}>
      {children}
    </AppIconButton>
  );
}

export default MobileCheckButton;
