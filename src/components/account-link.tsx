import { Link } from "@void/react";
import { cn } from "@/lib/utils";

export type AccountUser = { name: string; email: string };

export function userInitial(user: AccountUser) {
  return (user.name || user.email).charAt(0).toUpperCase();
}

export function AccountLink({ user, active = false }: { user: AccountUser; active?: boolean }) {
  return (
    <Link
      href="/settings"
      aria-label="設定とアカウント"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-avatar text-sm font-semibold text-foreground hover:text-foreground",
        active ? "border-2 border-primary" : "border border-border",
      )}
    >
      {userInitial(user)}
    </Link>
  );
}
