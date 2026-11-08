import { Link, useRouter } from "@void/react";
import { LockIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { NewAlbumDialog, UploadDialog } from "@/components/album-dialogs";
import { AccountLink } from "@/components/account-link";
import { BottomNav } from "@/components/bottom-nav";
import { MainHeader } from "@/components/main-header";
import { MobileFab } from "@/components/mobile-fab";
import { ShareAlbumPicker } from "@/components/share-dialog";
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
        index === 0 ? "row-span-2 max-md:row-span-1" : "max-md:hidden",
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
      className="flex min-w-0 flex-col gap-3 text-foreground hover:text-link-hover max-md:gap-2"
    >
      <div className="relative grid aspect-[4/3] grid-cols-[2fr_1fr] grid-rows-2 gap-[3px] overflow-hidden rounded-2xl max-md:aspect-square max-md:grid-cols-1 max-md:grid-rows-1 max-md:rounded-[14px]">
        <Cover ids={album.coverIds} />
        {album.sharedLabel && (
          <span className="absolute top-2.5 left-2.5 flex h-7 items-center gap-1.5 rounded-full bg-[rgba(24,24,27,0.72)] px-2.5 text-xs font-medium text-white max-md:top-auto max-md:bottom-2 max-md:left-2 max-md:w-7 max-md:justify-center max-md:p-0">
            <UsersIcon className="size-3.5" />
            <span className="max-md:sr-only">{album.sharedLabel}</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[3px] px-0.5 max-md:gap-0.5">
        <span className="truncate text-base font-semibold max-md:text-[15px]">{album.title}</span>
        <span className="text-[13px] text-muted-foreground">
          {formatCount(album.count)} 枚
          {album.ownerName ? (
            <>
              {" · "}
              {album.ownerName}さん<span className="max-md:hidden">から共有</span>
            </>
          ) : (
            album.lastTakenAt && <span className="max-md:hidden"> · {formatMonth(album.lastTakenAt)}</span>
          )}
        </span>
      </div>
    </Link>
  );
}

// 中身が分からないよう、写真ではなく色だけで見せる
function HiddenAlbumCard() {
  return (
    <Link href="/hidden" className="flex min-w-0 flex-col gap-3 text-foreground hover:text-link-hover max-md:gap-2">
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-linear-135 from-[#3f3d56] via-[#6b5b95] to-[#c39bd3] max-md:aspect-square max-md:rounded-[14px]">
        <LockIcon className="size-8 text-white/90" strokeWidth={1.8} />
      </div>
      <div className="flex flex-col gap-[3px] px-0.5 max-md:gap-0.5">
        <span className="truncate text-base font-semibold max-md:text-[15px]">非表示</span>
        <span className="text-[13px] text-muted-foreground">パスワードで保護</span>
      </div>
    </Link>
  );
}

export default function AlbumsPage({
  user,
  q,
  pickingShare,
  albums,
  showHiddenAlbum,
  albumOptions,
  ownedAlbums,
  settings,
  stats,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState(q);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const visible = albums.filter(
    (album) => tab === "all" || album.owned === (tab === "mine"),
  );

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    void router.visit(value ? `/?q=${encodeURIComponent(value)}` : "/");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainHeader user={user} current="albums" initialQuery={q} onUpload={() => setUploading(true)} />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-10 pb-16 max-md:gap-4 max-md:px-4 max-md:pt-5 max-md:pb-[120px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center justify-between max-md:w-full">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[32px] font-bold tracking-[-0.02em] max-md:text-[30px]">アルバム</h1>
              <p className="text-sm text-muted-foreground max-md:hidden">
                {stats.albums} アルバム · {formatCount(stats.photos)} 枚 · {formatBytes(stats.bytes)} 使用中
              </p>
            </div>
            <div className="md:hidden">
              <AccountLink user={user} />
            </div>
          </div>
          <form role="search" className="relative w-full md:hidden" onSubmit={search}>
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
              className="h-11 w-full rounded-xl bg-muted pr-3.5 pl-[42px] text-base text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            />
          </form>
          <div
            role="tablist"
            aria-label="表示切り替え"
            className="flex gap-1 rounded-xl bg-muted p-1 max-md:gap-2 max-md:rounded-none max-md:bg-transparent max-md:p-0"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "h-9 cursor-pointer rounded-[9px] px-3.5 text-[13px] font-semibold max-md:rounded-full max-md:border max-md:px-4 max-md:text-sm",
                  tab === item.id
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] max-md:border-foreground max-md:bg-foreground max-md:text-background dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                    : "text-muted-foreground max-md:border-input max-md:text-foreground",
                )}
              >
                <span className="max-md:hidden">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-5 gap-y-7 max-md:grid-cols-2 max-md:gap-x-3 max-md:gap-y-5">
          {visible.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
          {showHiddenAlbum && !q && tab !== "shared" && <HiddenAlbumCard />}
          {tab === "shared" ? (
            visible.length === 0 && (
              <p className="col-span-full py-16 text-center text-sm text-muted-foreground">
                共有されたアルバムはまだありません
              </p>
            )
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] max-md:aspect-square max-md:rounded-[14px] border-dashed border-input text-sm font-medium text-muted-foreground"
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
      <UploadDialog open={uploading} onOpenChange={setUploading} albums={albumOptions} settings={settings} />
      <ShareAlbumPicker
        open={pickingShare}
        onClose={() => void router.visit("/", { preserveScroll: true, replace: true })}
        albums={ownedAlbums}
      />
    </div>
  );
}
