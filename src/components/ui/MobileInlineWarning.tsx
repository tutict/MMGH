import React from "react";
import { joinClassNames } from "./classNames";

type MobileInlineWarningProps = React.HTMLAttributes<HTMLParagraphElement> & {
  danger?: boolean;
};

function MobileInlineWarning({ danger = false, className, children, ...props }: MobileInlineWarningProps) {
  return (
    <p className={joinClassNames("mobile-inline-warning", danger ? "is-danger" : null, className)} {...props}>
      {children}
    </p>
  );
}

export default MobileInlineWarning;
