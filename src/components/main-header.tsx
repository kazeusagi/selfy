import { useRouter } from "@void/react";
import { UploadIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { AccountLink, type AccountUser } from "@/components/account-link";
import { AppHeader, HeaderSearch, type MainNavPage, MainNav } from "@/components/app-header";
import { Button } from "@/components/ui/button";

export function MainHeader({
  user,
  current,
  initialQuery = "",
  onUpload,
  filter,
}: {
  user: AccountUser;
  current?: MainNavPage;
  initialQuery?: string;
  onUpload: () => void;
  // 写真の一覧があるページでだけ、検索の横に絞り込みを出す
  filter?: ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    void router.visit(value ? `/?q=${encodeURIComponent(value)}` : "/");
  }

  return (
    <AppHeader className="max-md:hidden">
      <MainNav current={current} />
      <form role="search" className="contents" onSubmit={search}>
        <HeaderSearch
          id="q"
          label="検索"
          placeholder="アルバムや写真を検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
      {filter}
      <div className="flex items-center gap-2.5">
        <Button size="pill" className="font-semibold" onClick={onUpload}>
          <UploadIcon />
          アップロード
        </Button>
        <AccountLink user={user} active={current === undefined} />
      </div>
    </AppHeader>
  );
}
