import type { HTMLAttributes } from "react";

export function Container({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full max-w-7xl px-4 ${className}`} {...props} />;
}
