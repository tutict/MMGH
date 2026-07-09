import React from "react";
import { joinClassNames } from "./classNames";

type MobileSummaryCellProps = React.HTMLAttributes<HTMLElement>;

function MobileSummaryCell({ className, children, ...props }: MobileSummaryCellProps) {
  return (
    <article className={joinClassNames("mobile-summary-cell", className)} {...props}>
      {children}
    </article>
  );
}

export default MobileSummaryCell;
