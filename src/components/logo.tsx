import { cn } from "@/lib/utils";

export function LogoMark({ className, iconSize }: { className?: string; iconSize: number }) {
  return (
    <span className={cn("flex items-center justify-center bg-primary", className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    </span>
  );
}
