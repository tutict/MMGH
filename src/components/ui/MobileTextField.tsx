import React from "react";

import AppTextField from "./AppTextField";

type MobileTextFieldProps = React.ComponentProps<typeof AppTextField>;

function MobileTextField({ fieldClassName = "mobile-field", ...props }: MobileTextFieldProps) {
  return <AppTextField fieldClassName={fieldClassName} {...props} />;
}

export default MobileTextField;
