import React from "react";
import { joinClassNames } from "./classNames";

type MobileMutedProps = React.HTMLAttributes<HTMLElement> & {
  as?: "p" | "span";
};

function MobileMuted({ as: Component = "p", className, children, ...props }: MobileMutedProps) {
  return (
    <Component className={joinClassNames("mobile-muted", className)} {...props}>
      {children}
    </Component>
  );
}

export default MobileMuted;
