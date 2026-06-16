import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Container({ children, className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1200px] px-[clamp(20px,5vw,80px)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
