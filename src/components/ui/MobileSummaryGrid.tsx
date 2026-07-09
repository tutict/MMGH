import React from "react";
import { joinClassNames } from "./classNames";

type MobileSummaryGridProps = React.HTMLAttributes<HTMLDivElement>;

function MobileSummaryGrid({ className, children, ...props }: MobileSummaryGridProps) {
  return (
    <div className={joinClassNames("mobile-summary-grid", className)} {...props}>
      {children}
    </div>
  );
}

export default MobileSummaryGrid;
