import React from "react";
import { joinClassNames } from "./classNames";

type MobileRowBodyProps = React.HTMLAttributes<HTMLSpanElement>;

function MobileRowBody({ className, children, ...props }: MobileRowBodyProps) {
  return (
    <span className={joinClassNames("mobile-row__body", className)} {...props}>
      {children}
    </span>
  );
}

export default MobileRowBody;
