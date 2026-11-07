import { Link, useRouter } from "@void/react";
import { PlusIcon, UploadIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { NewAlbumDialog, UploadDialog } from "@/components/album-dialogs";
import { AccountMenu } from "@/components/account-menu";
import { AppHeader, HeaderSearch } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { formatBytes, formatCount, formatMonth } from "@/lib/format";
import { photoUrl } from "@/lib/photo-url";
import { cn } from "@/lib/utils";
import type { Props } from "./index.server";

const TABS = [
  { id: "all", label: "すべて" },
  { id: "mine", label: "自分のアルバム" },
  { id: "shared", label: "共有されたアルバム" },
] as const;

const PLACEHOLDERS = ["bg-[#a48b78]", "bg-[#c9b8a3]", "bg-[#6e7f6a]"];

function Cover({ ids }: { ids: string[] }) {
  return PLACEHOLDERS.map((placeholder, index) => (
    <div key={placeholder} className={cn(placeholder, index === 0 && "row-span-2", "min-h-0 overflow-hidden")}>
      {ids[index] && (
        <img src={photoUrl(ids[index], "thumb")} alt="" loading="lazy" className="size-full object-cover" />
      )}
    </div>
  ));
}

function AlbumCard({ album }: { album: Props["albums"][number] }) {
  const meta = [`${formatCount(album.count)} 枚`];
  if (album.lastTakenAt) meta.push(formatMonth(album.lastTakenAt));
  return (
    <Link href={`/albums/${album.id}`} className="flex flex-col gap-3 text-foreground hover:text-link-hover">
      <div className="relative grid aspect-[4/3] grid-cols-[2fr_1fr] grid-rows-2 gap-[3px] overflow-hidden rounded-2xl">
        <Cover ids={album.coverIds} />
        {album.shared && (
          <span className="absolute top-2.5 left-2.5 flex h-7 items-center gap-1.5 rounded-full bg-[rgba(24,24,27,0.72)] px-2.5 text-xs font-medium text-white">
            <UsersIcon className="size-3.5" />
            リンクで共有
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[3px] px-0.5">
        <span className="text-base font-semibold">{album.title}</span>
        <span className="text-[13px] text-muted-foreground">{meta.join(" · ")}</span>
      </div>
    </Link>
  );
}

export default function AlbumsPage({ user, q, albums, albumOptions, stats }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState(q);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 他の人から共有されたアルバムはまだないので、このタブだけ常に空になる
  const visible = tab === "shared" ? [] : albums;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader>
        <form
          role="search"
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            const value = query.trim();
            void router.visit(value ? `/?q=${encodeURIComponent(value)}` : "/");
          }}
        >
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
      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-10 pb-16 max-sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[32px] font-bold tracking-[-0.02em]">アルバム</h1>
            <p className="text-sm text-muted-foreground">
              {stats.albums} アルバム · {formatCount(stats.photos)} 枚 · {formatBytes(stats.bytes)} 使用中
            </p>
          </div>
          <div role="tablist" aria-label="表示切り替え" className="flex gap-1 rounded-xl bg-muted p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "h-9 cursor-pointer rounded-[9px] px-3.5 text-[13px] font-semibold",
                  tab === item.id
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-5 gap-y-7">
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
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-input text-sm font-medium text-muted-foreground"
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
      <NewAlbumDialog open={creating} onOpenChange={setCreating} />
      <UploadDialog open={uploading} onOpenChange={setUploading} albums={albumOptions} />
    </div>
  );
}
