import React from "react";

import { joinClassNames } from "./classNames";

type MobilePageProps = React.HTMLAttributes<HTMLDivElement> & {
  view: string;
};

function MobilePage({ children, className, view, ...props }: MobilePageProps) {
  return (
    <div className={joinClassNames("mobile-page", className)} data-view={view} {...props}>
      {children}
    </div>
  );
}

export default MobilePage;
