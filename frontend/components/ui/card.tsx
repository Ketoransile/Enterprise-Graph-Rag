import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-xl backdrop-blur",
        "hover:border-slate-700 transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={clsx("px-4 pt-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  return (
    <h3
      className={clsx(
        "text-sm font-semibold uppercase tracking-wide text-slate-300",
        className,
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={clsx("px-4 pb-4", className)} {...props} />;
}
