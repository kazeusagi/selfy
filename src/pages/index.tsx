import { Link, useRouter } from "@void/react";
import { PlusIcon, SearchIcon, UploadIcon, UsersIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { NewAlbumDialog, UploadDialog } from "@/components/album-dialogs";
import { AccountMenu } from "@/components/account-menu";
import { AppHeader, HeaderSearch } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { MobileFab } from "@/components/mobile-fab";
import { ShareAlbumPicker } from "@/components/share-dialog";
import { Button } from "@/components/ui/button";
import { formatBytes, formatCount, formatMonth } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";
import { cn } from "@/lib/utils";
import type { Props } from "./index.server";

const TABS = [
  { id: "all", label: "すべて", shortLabel: "すべて" },
  { id: "mine", label: "自分のアルバム", shortLabel: "自分" },
  { id: "shared", label: "共有されたアルバム", shortLabel: "共有された" },
] as const;

const PLACEHOLDERS = ["bg-[#a48b78]", "bg-[#c9b8a3]", "bg-[#6e7f6a]"];

function Cover({ ids }: { ids: string[] }) {
  return PLACEHOLDERS.map((placeholder, index) => (
    <div
      key={placeholder}
      className={cn(
        placeholder,
        index === 0 ? "row-span-2 max-sm:row-span-1" : "max-sm:hidden",
        "min-h-0 overflow-hidden",
      )}
    >
      {ids[index] && (
        <img src={photoUrl(ids[index], "thumb")} alt="" loading="lazy" className="size-full object-cover" />
      )}
    </div>
  ));
}

function AlbumCard({ album }: { album: Props["albums"][number] }) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="flex min-w-0 flex-col gap-3 text-foreground hover:text-link-hover max-sm:gap-2"
    >
      <div className="relative grid aspect-[4/3] grid-cols-[2fr_1fr] grid-rows-2 gap-[3px] overflow-hidden rounded-2xl max-sm:aspect-square max-sm:grid-cols-1 max-sm:grid-rows-1 max-sm:rounded-[14px]">
        <Cover ids={album.coverIds} />
        {album.shared && (
          <span className="absolute top-2.5 left-2.5 flex h-7 items-center gap-1.5 rounded-full bg-[rgba(24,24,27,0.72)] px-2.5 text-xs font-medium text-white max-sm:top-auto max-sm:bottom-2 max-sm:left-2 max-sm:w-7 max-sm:justify-center max-sm:p-0">
            <UsersIcon className="size-3.5" />
            <span className="max-sm:sr-only">リンクで共有</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[3px] px-0.5 max-sm:gap-0.5">
        <span className="truncate text-base font-semibold max-sm:text-[15px]">{album.title}</span>
        <span className="text-[13px] text-muted-foreground">
          {formatCount(album.count)} 枚
          {album.lastTakenAt && <span className="max-sm:hidden"> · {formatMonth(album.lastTakenAt)}</span>}
        </span>
      </div>
    </Link>
  );
}

export default function AlbumsPage({ user, q, pickingShare, albums, albumOptions, stats }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState(q);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 他の人から共有されたアルバムはまだないので、このタブだけ常に空になる
  const visible = tab === "shared" ? [] : albums;

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    void router.visit(value ? `/?q=${encodeURIComponent(value)}` : "/");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader className="max-sm:hidden">
        <form role="search" className="contents" onSubmit={search}>
          <HeaderSearch
            id="q"
            label="検索"
            placeholder="アルバムや写真を検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <div className="flex items-center gap-2.5">
          <Button size="pill" className="font-semibold" onClick={() => setUploading(true)}>
            <UploadIcon />
            アップロード
          </Button>
          <AccountMenu user={user} />
        </div>
      </AppHeader>
      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-10 pb-16 max-sm:gap-4 max-sm:px-4 max-sm:pt-5 max-sm:pb-[120px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center justify-between max-sm:w-full">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[32px] font-bold tracking-[-0.02em] max-sm:text-[30px]">アルバム</h1>
              <p className="text-sm text-muted-foreground max-sm:hidden">
                {stats.albums} アルバム · {formatCount(stats.photos)} 枚 · {formatBytes(stats.bytes)} 使用中
              </p>
            </div>
            <div className="sm:hidden">
              <AccountMenu user={user} />
            </div>
          </div>
          <form role="search" className="relative w-full sm:hidden" onSubmit={search}>
            <label htmlFor="mq" className="sr-only">
              検索
            </label>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-[13px] left-3.5 size-[18px] text-subtle-foreground"
            />
            <input
              id="mq"
              type="search"
              placeholder="アルバムや写真を検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl bg-muted pr-3.5 pl-[42px] text-base text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring dark:bg-[#232326]"
            />
          </form>
          <div
            role="tablist"
            aria-label="表示切り替え"
            className="flex gap-1 rounded-xl bg-muted p-1 max-sm:gap-2 max-sm:rounded-none max-sm:bg-transparent max-sm:p-0"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "h-9 cursor-pointer rounded-[9px] px-3.5 text-[13px] font-semibold max-sm:rounded-full max-sm:border max-sm:px-4 max-sm:text-sm",
                  tab === item.id
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] max-sm:border-foreground max-sm:bg-foreground max-sm:text-background dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                    : "text-muted-foreground max-sm:border-input max-sm:text-foreground",
                )}
              >
                <span className="max-sm:hidden">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-5 gap-y-7 max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-5">
          {visible.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
          {tab === "shared" ? (
            <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
              共有されたアルバムはまだありません
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] max-sm:aspect-square max-sm:rounded-[14px] border-dashed border-input text-sm font-medium text-muted-foreground"
            >
              <PlusIcon className="size-[26px]" strokeWidth={1.8} />
              新しいアルバム
            </button>
          )}
        </div>
        {q && visible.length === 0 && tab !== "shared" && (
          <p className="text-sm text-muted-foreground">「{q}」に一致するアルバムはありません</p>
        )}
      </main>
      <MobileFab aria-label="写真をアップロード" className="bottom-24" onClick={() => setUploading(true)} />
      <BottomNav current={pickingShare ? "share" : "albums"} />
      <NewAlbumDialog open={creating} onOpenChange={setCreating} />
      <UploadDialog open={uploading} onOpenChange={setUploading} albums={albumOptions} />
      <ShareAlbumPicker
        open={pickingShare}
        onClose={() => void router.visit("/", { preserveScroll: true, replace: true })}
        albums={albumOptions}
      />
    </div>
  );
}
