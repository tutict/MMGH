import React from "react";
import { Chip } from "@mui/material";
import { joinClassNames } from "./classNames";

type MobileChipProps = React.ComponentProps<typeof Chip> & {
  active?: boolean;
};

function MobileChip({ active = false, className, ...props }: MobileChipProps) {
  return <Chip className={joinClassNames("mobile-pill-button", active ? "is-active" : null, className)} {...props} />;
}

export default MobileChip;
