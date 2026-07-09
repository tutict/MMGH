import React from "react";
import { joinClassNames } from "./classNames";

type MobileSearchRowProps = React.HTMLAttributes<HTMLDivElement>;

function MobileSearchRow({ children, className, ...props }: MobileSearchRowProps) {
  return (
    <div className={joinClassNames("mobile-search-row", className)} {...props}>
      {children}
    </div>
  );
}

export default MobileSearchRow;
