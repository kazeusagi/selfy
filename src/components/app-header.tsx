import { Link } from "@void/react";
import { SearchIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "albums", label: "アルバム", href: "/" },
  { id: "favorites", label: "お気に入り", href: "/favorites" },
] as const;

export type MainNavPage = (typeof NAV_ITEMS)[number]["id"];

export function MainNav({ current }: { current?: MainNavPage }) {
  return (
    <nav aria-label="メインメニュー" className="flex gap-1">
      {NAV_ITEMS.map(({ id, label, href }) => (
        <Link
          key={id}
          href={href}
          aria-current={id === current ? "page" : undefined}
          className={cn(
            "flex h-9 items-center rounded-full px-3.5 text-sm hover:text-link-hover",
            id === current ? "bg-muted font-semibold text-foreground" : "font-medium text-muted-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AppHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <header className={cn("sticky top-0 z-20 border-b border-border bg-header", className)}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-4 px-8 py-3.5 max-md:px-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.02em] text-foreground hover:text-link-hover"
        >
          <LogoMark className="size-[30px] rounded-[9px]" iconSize={17} />
          Selfy
        </Link>
        {children}
      </div>
    </header>
  );
}

export function HeaderSearch({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <div className="relative mx-auto max-w-[480px] flex-[1_1_280px]">
      <label htmlFor={props.id} className="sr-only">
        {label}
      </label>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-[13px] left-3.5 size-[18px] text-subtle-foreground"
      />
      <input
        type="search"
        className="h-11 w-full rounded-full border border-border bg-card pr-4 pl-[42px] text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        {...props}
      />
    </div>
  );
}
