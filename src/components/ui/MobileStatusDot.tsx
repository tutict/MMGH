import React from "react";
import { joinClassNames } from "./classNames";

type MobileStatusDotProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: string | false | null;
};

function MobileStatusDot({ tone = "ready", className, ...props }: MobileStatusDotProps) {
  return <span className={joinClassNames("mobile-status-dot", tone ? `is-${tone}` : null, className)} {...props} />;
}

export default MobileStatusDot;
