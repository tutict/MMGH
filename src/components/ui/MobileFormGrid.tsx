import React from "react";
import { joinClassNames } from "./classNames";

type MobileFormGridProps = React.HTMLAttributes<HTMLDivElement>;

function MobileFormGrid({ children, className, ...props }: MobileFormGridProps) {
  return (
    <div className={joinClassNames("mobile-form-grid", className)} {...props}>
      {children}
    </div>
  );
}

export default MobileFormGrid;
