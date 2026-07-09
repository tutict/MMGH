import React from "react";

import { joinClassNames } from "./classNames";

type MobileRowVariant = "cache" | "reminder" | "summary";

type MobileRowProps = React.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  interactive?: boolean;
  variant?: MobileRowVariant;
};

function MobileRow({ active, children, className, interactive, variant, ...props }: MobileRowProps) {
  return (
    <div
      className={joinClassNames(
        "mobile-row",
        interactive ? "mobile-row--interactive" : null,
        variant ? `mobile-${variant}-row` : null,
        active ? "is-active" : null,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default MobileRow;
