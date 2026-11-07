import { KeyRoundIcon, LogOutIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeItems } from "@/components/theme-items";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export type AccountUser = { name: string; email: string };

export function userInitial(user: AccountUser) {
  return (user.name || user.email).charAt(0).toUpperCase();
}

export function AccountMenu({ user }: { user: AccountUser }) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function addPasskey() {
    const { error } = await authClient.passkey.addPasskey({ name: "Selfy" });
    setNotice(error ? "パスキーを登録できませんでした" : "パスキーを登録しました");
  }

  async function signOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="アカウント"
          className="size-11 shrink-0 cursor-pointer rounded-full border border-border bg-avatar text-sm font-semibold text-foreground"
        >
          {userInitial(user)}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={addPasskey}>
              <KeyRoundIcon />
              パスキーを登録
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>テーマ</DropdownMenuLabel>
            <ThemeItems />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut}>
            <LogOutIcon />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {notice && (
        <div
          role="status"
          className="fixed right-6 bottom-6 z-50 max-sm:right-4 max-sm:bottom-40 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg"
        >
          {notice}
        </div>
      )}
    </>
  );
}
