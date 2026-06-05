"use client";

import type { ComponentProps } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-neutral-200 group-[.toaster]:bg-white group-[.toaster]:text-neutral-950 group-[.toaster]:shadow-lg group-[.toaster]:dark:border-neutral-800 group-[.toaster]:dark:bg-neutral-950 group-[.toaster]:dark:text-neutral-50",
          description:
            "group-[.toast]:text-neutral-600 group-[.toast]:dark:text-neutral-400",
          actionButton:
            "group-[.toast]:bg-neutral-900 group-[.toast]:text-neutral-50 group-[.toast]:dark:bg-neutral-50 group-[.toast]:dark:text-neutral-950",
          cancelButton:
            "group-[.toast]:bg-neutral-100 group-[.toast]:text-neutral-600 group-[.toast]:dark:bg-neutral-800 group-[.toast]:dark:text-neutral-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
