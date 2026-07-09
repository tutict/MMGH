import React from "react";
import { joinClassNames } from "./classNames";

type MobileListProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "inset" | "metrics" | "suggestions";
};

function MobileList({ children, className, variant, ...props }: MobileListProps) {
  return (
    <div className={joinClassNames("mobile-list", variant ? `mobile-list--${variant}` : null, className)} {...props}>
      {children}
    </div>
  );
}

export default MobileList;
