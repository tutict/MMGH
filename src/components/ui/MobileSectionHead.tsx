import React from "react";
import { joinClassNames } from "./classNames";

type MobileSectionHeadProps = React.HTMLAttributes<HTMLDivElement> & {
  line?: boolean;
};

function MobileSectionHead({ children, className, line, ...props }: MobileSectionHeadProps) {
  return (
    <div className={joinClassNames("mobile-section__head", line ? "mobile-section__head--line" : null, className)} {...props}>
      {children}
    </div>
  );
}

export default MobileSectionHead;
