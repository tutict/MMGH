import React from "react";
import { joinClassNames } from "./classNames";

type MobileListProps = React.HTMLAttributes<HTMLDivElement>;

function MobileList({ children, className, ...props }: MobileListProps) {
  return (
    <div className={joinClassNames("mobile-list", className)} {...props}>
      {children}
    </div>
  );
}

export default MobileList;
