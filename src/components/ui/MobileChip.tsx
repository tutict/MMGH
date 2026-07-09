import React from "react";
import { Chip } from "@mui/material";

type MobileChipProps = React.ComponentProps<typeof Chip>;

function MobileChip(props: MobileChipProps) {
  return <Chip {...props} />;
}

export default MobileChip;
