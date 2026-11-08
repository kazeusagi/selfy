import { Link } from "@void/react";
import { cn } from "@/lib/utils";

export type AccountUser = { name: string; email: string; image?: string | null };

export function userInitial(user: AccountUser) {
  return (user.name || user.email).charAt(0).toUpperCase();
}

// 画像がなければ頭文字を出す。大きさと背景色は呼び出し側で決める
export function UserAvatar({ user, className }: { user: AccountUser; className?: string }) {
  return (
    <span
      className={cn(
        "flex flex-none items-center justify-center overflow-hidden rounded-full bg-avatar font-semibold text-foreground",
        className,
      )}
    >
      {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : userInitial(user)}
    </span>
  );
}

export function AccountLink({ user, active = false }: { user: AccountUser; active?: boolean }) {
  return (
    <Link
      href="/settings"
      aria-label="設定とアカウント"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full hover:text-foreground",
        active ? "border-2 border-primary" : "border border-border",
      )}
    >
      <UserAvatar user={user} className="size-full text-sm" />
    </Link>
  );
}
