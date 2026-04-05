"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function AppToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "font-sans border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50",
          error: "border-red-200 dark:border-red-900",
          success: "border-emerald-200 dark:border-emerald-900",
        },
      }}
    />
  );
}
