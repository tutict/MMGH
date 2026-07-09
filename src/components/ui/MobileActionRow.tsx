import React from "react";
import { joinClassNames } from "./classNames";

type MobileActionRowProps = React.HTMLAttributes<HTMLDivElement> & {
  columns?: "three";
};

function MobileActionRow({ children, className, columns, ...props }: MobileActionRowProps) {
  return (
    <div
      className={joinClassNames(
        "mobile-action-row",
        columns === "three" ? "mobile-action-row--three" : null,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default MobileActionRow;
