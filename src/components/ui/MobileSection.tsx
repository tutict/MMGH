import React from "react";

import { joinClassNames } from "./classNames";

type MobileSectionProps = React.HTMLAttributes<HTMLElement> & {
  flush?: boolean;
};

function MobileSection({ children, className, flush, ...props }: MobileSectionProps) {
  return (
    <section className={joinClassNames("mobile-section", flush ? "mobile-section--flush" : null, className)} {...props}>
      {children}
    </section>
  );
}

export default MobileSection;
