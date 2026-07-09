import React from "react";
import { joinClassNames } from "./classNames";

type MobileFormProps<T extends React.ElementType = "div"> = {
  as?: T;
  className?: string;
  compact?: boolean;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

function MobileForm<T extends React.ElementType = "div">({
  as,
  children,
  className,
  compact,
  ...props
}: MobileFormProps<T>) {
  const Component = as || "div";

  return (
    <Component className={joinClassNames("mobile-form", compact ? "mobile-form--compact" : null, className)} {...props}>
      {children}
    </Component>
  );
}

export default MobileForm;
