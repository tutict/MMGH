import React from "react";

import { joinClassNames } from "./classNames";

type MobilePageProps = React.HTMLAttributes<HTMLDivElement> & {
  view: string;
};

function MobilePage({ children, className, view, ...props }: MobilePageProps) {
  return (
    <div className={joinClassNames("mobile-page", `mobile-page--${view}`, className)} {...props}>
      {children}
    </div>
  );
}

export default MobilePage;
