import React from "react";
import { joinClassNames } from "./classNames";

type MobileEmptyProps = React.HTMLAttributes<HTMLElement> & {
  as?: "div" | "p";
};

function MobileEmpty({ as: Component = "p", className, children, ...props }: MobileEmptyProps) {
  return (
    <Component className={joinClassNames("mobile-empty", className)} {...props}>
      {children}
    </Component>
  );
}

export default MobileEmpty;
