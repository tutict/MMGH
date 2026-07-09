import React from "react";
import { joinClassNames } from "./classNames";

type AppStatusChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: string | false | null;
};

function AppStatusChip({ tone = null, className, children, ...props }: AppStatusChipProps) {
  return (
    <span className={joinClassNames("status-chip", tone ? `status-${tone}` : null, className)} {...props}>
      {children}
    </span>
  );
}

export default AppStatusChip;
