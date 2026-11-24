import type { ElementType, ReactNode } from "react";

/** Immediate lightweight container without scroll lag or blur overhead */
export function Reveal({
  children,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  return <Tag className={className}>{children}</Tag>;
}
