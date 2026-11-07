import { AccountMenu, type AccountUser } from "@/components/account-menu";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export function PlaceholderPage({
  title,
  current,
  user,
}: {
  title: string;
  current: "favorites" | "settings";
  user: AccountUser;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader className="max-sm:hidden">
        <div className="ml-auto">
          <AccountMenu user={user} />
        </div>
      </AppHeader>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-8 pt-10 pb-16 max-sm:px-4 max-sm:pt-5 max-sm:pb-[120px]">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] max-sm:text-[30px]">{title}</h1>
        <p className="py-16 text-center text-sm text-muted-foreground">準備中です</p>
      </main>
      <BottomNav current={current} />
    </div>
  );
}
