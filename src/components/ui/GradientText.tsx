"use client";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface GradientTextProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "p";
}

export function GradientText({ children, className, as = "span" }: GradientTextProps) {
  const Tag = as;
  return (
    <Tag className={cn("gradient-text", className)}>
      {children}
    </Tag>
  );
}
