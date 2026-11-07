import { Link, useRouter } from "@void/react";
import { ChevronLeftIcon, EllipsisIcon, PencilIcon, Share2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AlbumTitleDialog } from "@/components/album-dialogs";
import { AccountLink } from "@/components/account-link";
import { AppHeader, HeaderSearch, MainNav } from "@/components/app-header";
import { Lightbox } from "@/components/lightbox";
import { MobileFab } from "@/components/mobile-fab";
import { PhotoGrid } from "@/components/photo-grid";
import { ShareDialog } from "@/components/share-dialog";
import { IMAGE_ACCEPT, UploadStatus } from "@/components/upload-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUploader } from "@/hooks/use-uploader";
import { formatCount, formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Props } from "./[id].server";

type Photo = Props["photos"][number];
type PendingDelete = { kind: "album" } | { kind: "photo"; photo: Photo };

const AVATAR_COLORS = ["bg-avatar", "bg-avatar-2", "bg-avatar-3"];

export default function AlbumPage({
  user,
  album,
  role,
  canAdd,
  startSharing,
  photos,
  members,
  candidates,
  avatars,
  shareLink,
  settings,
}: Props) {
  const router = useRouter();
  const uploader = useUploader(settings);
  const isOwner = role === "owner";
  const sharedStatus =
    avatars.length > 1
      ? `${avatars.length}人と共有中`
      : shareLink?.active
        ? "リンクで共有中"
        : null;
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [sharing, setSharing] = useState(startSharing);
  const [renaming, setRenaming] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return photos
      .map((photo) => ({ ...photo, favorite: favorites[photo.id] ?? photo.favorite }))
      .filter(
        (photo) =>
          !needle ||
          photo.fileName.toLowerCase().includes(needle) ||
          photo.camera?.toLowerCase().includes(needle),
      );
  }, [photos, favorites, query]);

  const openIndex = visible.findIndex((photo) => photo.id === openId);
  const summary = [`${formatCount(photos.length)} 枚`];
  if (photos.length) summary.push(formatDateRange(photos[0].takenAt, photos[photos.length - 1].takenAt));

  async function toggleFavorite(photo: Photo) {
    const favorite = !photo.favorite;
    setFavorites((current) => ({ ...current, [photo.id]: favorite }));
    const response = await window.fetch(`/api/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ favorite }),
    });
    if (!response.ok) setFavorites((current) => ({ ...current, [photo.id]: photo.favorite }));
  }

  async function addFiles(files: File[]) {
    if (!files.length) return;
    await uploader.upload(album.id, files);
    await router.refresh({ preserveScroll: true });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "album") {
      await window.fetch(`/api/albums/${album.id}`, { method: "DELETE" });
      await router.visit("/");
      return;
    }
    const { id } = pendingDelete.photo;
    const next = visible[openIndex + 1] ?? visible[openIndex - 1];
    await window.fetch(`/api/photos/${id}`, { method: "DELETE" });
    setOpenId(next?.id ?? null);
    setPendingDelete(null);
    await router.refresh({ preserveScroll: true });
  }

  const menuItems = (
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem onSelect={() => setRenaming(true)}>
        <PencilIcon />
        名前を変更
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete({ kind: "album" })}>
        <Trash2Icon />
        アルバムを削除
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-1 border-b border-border bg-header px-1.5 md:hidden">
        <Link href="/" aria-label="アルバム一覧に戻る" className="flex size-11 flex-none items-center justify-center">
          <ChevronLeftIcon className="size-6" />
        </Link>
        <span className="truncate text-base font-semibold">{album.title}</span>
        {isOwner ? (
          <div className="flex flex-none">
            <button
              type="button"
              aria-label="共有"
              onClick={() => setSharing(true)}
              className="flex size-11 cursor-pointer items-center justify-center"
            >
              <Share2Icon className="size-[21px]" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="その他の操作"
                className="flex size-11 cursor-pointer items-center justify-center"
              >
                <EllipsisIcon className="size-5" />
              </DropdownMenuTrigger>
              {menuItems}
            </DropdownMenu>
          </div>
        ) : (
          <span aria-hidden="true" className="w-11 flex-none" />
        )}
      </header>
      <AppHeader className="max-md:hidden">
        <MainNav current="albums" />
        <HeaderSearch
          id="q2"
          label="検索"
          placeholder="このアルバム内を検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <AccountLink user={user} />
      </AppHeader>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-7 pb-16 max-md:gap-0 max-md:px-0 max-md:pt-0 max-md:pb-24">
        <div className="flex flex-col gap-3.5 max-md:px-4 max-md:pt-4 max-md:pb-2">
          <Link
            href="/"
            className="inline-flex min-h-8 items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-link-hover max-md:hidden"
          >
            <ChevronLeftIcon className="size-4" />
            アルバム
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2 max-md:w-full">
              <h1 className="text-[32px] font-bold tracking-[-0.02em] max-md:text-[26px] max-md:tracking-[-0.01em]">
                {album.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground max-md:justify-between max-md:text-[13px]">
                <span>{summary.join(" · ")}</span>
                {sharedStatus && (
                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => setSharing(true)}
                    className="flex items-center enabled:cursor-pointer max-md:h-9 max-md:px-1"
                  >
                    {avatars.slice(0, 3).map((initial, index) => (
                      <span
                        key={index}
                        className={cn(
                          "flex size-[26px] items-center justify-center rounded-full border-2 border-background text-[11px] font-semibold text-foreground max-md:size-6 max-md:text-[10px]",
                          AVATAR_COLORS[index],
                          index > 0 && "-ml-2",
                        )}
                      >
                        {initial}
                      </span>
                    ))}
                    <span className="ml-2 max-md:ml-1.5">{sharedStatus}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5 max-md:hidden">
              {isOwner && (
                <Button variant="surface" size="pill" className="font-semibold" onClick={() => setSharing(true)}>
                  <Share2Icon />
                  共有
                </Button>
              )}
              {canAdd && (
                <Button
                  size="pill"
                  className="font-semibold"
                  disabled={uploader.running}
                  onClick={() => fileInput.current?.click()}
                >
                  <UploadIcon />
                  写真を追加
                </Button>
              )}
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={IMAGE_ACCEPT}
                hidden
                onChange={(event) => {
                  void addFiles([...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="surface" size="icon-pill" aria-label="その他の操作">
                      <EllipsisIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  {menuItems}
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {photos.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground max-md:px-4">
            {canAdd ? "まだ写真がありません。「写真を追加」から追加してください。" : "まだ写真がありません。"}
          </p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground max-md:px-4">
            「{query}」に一致する写真はありません
          </p>
        ) : (
          <PhotoGrid photos={visible} onOpen={(photo) => setOpenId(photo.id)} />
        )}
      </main>

      {canAdd && (
        <MobileFab
          aria-label="写真を追加"
          className="bottom-8"
          disabled={uploader.running}
          onClick={() => fileInput.current?.click()}
        />
      )}

      {openIndex >= 0 && (
        <Lightbox
          photos={visible}
          index={openIndex}
          canDownload
          paused={pendingDelete !== null}
          onIndexChange={(index) => setOpenId(visible[index].id)}
          onClose={() => setOpenId(null)}
          onToggleFavorite={isOwner ? toggleFavorite : undefined}
          onDelete={(photo) => setPendingDelete({ kind: "photo", photo })}
        />
      )}

      {isOwner && (
        <ShareDialog
          open={sharing}
          onOpenChange={(open) => {
            setSharing(open);
            // 下部ナビから開いた場合は再読み込みや戻るで開き直さないよう URL から外す
            if (!open && startSharing) void router.visit(`/albums/${album.id}`, { preserveScroll: true, replace: true });
          }}
          albumId={album.id}
          albumTitle={album.title}
          user={user}
          members={members}
          candidates={candidates}
          link={shareLink}
          defaultExpiry={settings.defaultExpiry}
          stripGps={settings.stripGps}
        />
      )}
      <AlbumTitleDialog
        open={renaming}
        onOpenChange={setRenaming}
        initialTitle={album.title}
        heading="アルバム名を変更"
        submitLabel="保存"
        onSubmit={async (title) => {
          const response = await window.fetch(`/api/albums/${album.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title }),
          });
          if (!response.ok) throw new Error("保存できませんでした");
          await router.refresh({ preserveScroll: true });
        }}
      />
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "album" ? "アルバムを削除しますか？" : "写真を削除しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "album"
                ? `「${album.title}」と中の写真 ${photos.length} 枚を完全に削除します。元に戻せません。`
                : "元の画像も完全に削除します。元に戻せません。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UploadStatus {...uploader} onDismiss={uploader.dismiss} />
    </div>
  );
}
