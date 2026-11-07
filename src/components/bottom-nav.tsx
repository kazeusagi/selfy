import { Link } from "@void/react";
import { HeartIcon, LayoutGridIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { id: "albums", label: "アルバム", href: "/", icon: LayoutGridIcon },
  { id: "favorites", label: "お気に入り", href: "/favorites", icon: HeartIcon },
  { id: "share", label: "共有", href: "/?share", icon: UsersIcon },
  { id: "settings", label: "設定", href: "/settings", icon: SettingsIcon },
] as const;

export function BottomNav({ current }: { current: (typeof ITEMS)[number]["id"] }) {
  return (
    <nav
      aria-label="メインメニュー"
      className="fixed inset-x-0 bottom-0 z-20 flex h-20 border-t border-border bg-header pb-4 md:hidden"
    >
      {ITEMS.map(({ id, label, href, icon: Icon }) => (
        <Link
          key={id}
          href={href}
          aria-current={id === current ? "page" : undefined}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-[11px]",
            id === current ? "font-semibold text-link-hover" : "font-medium text-muted-foreground",
          )}
        >
          <Icon className={cn("size-6", id === "favorites" && id === current && "fill-current")} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
