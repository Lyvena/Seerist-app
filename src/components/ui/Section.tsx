import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Section({ children, className, ...props }: SectionProps) {
  return (
    <section className={cn("py-[clamp(80px,12vw,160px)]", className)} {...props}>
      {children}
    </section>
  );
}
