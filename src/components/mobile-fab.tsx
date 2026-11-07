import { PlusIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function MobileFab({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "fixed right-4 z-20 flex size-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(39,71,214,0.35)] disabled:opacity-50 sm:hidden dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]",
        className,
      )}
      {...props}
    >
      <PlusIcon className="size-6" strokeWidth={2.2} />
    </button>
  );
}
