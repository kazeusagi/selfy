import { Link, useRouter } from "@void/react";
import { ChevronLeftIcon, EllipsisIcon, PencilIcon, Share2Icon, Trash2Icon, UploadIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AlbumTitleDialog } from "@/components/album-dialogs";
import { AccountMenu, userInitial } from "@/components/account-menu";
import { AppHeader, HeaderSearch } from "@/components/app-header";
import { Lightbox } from "@/components/lightbox";
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
import type { Props } from "./[id].server";

type Photo = Props["photos"][number];
type PendingDelete = { kind: "album" } | { kind: "photo"; photo: Photo };

export default function AlbumPage({ user, album, photos, shareLink }: Props) {
  const router = useRouter();
  const uploader = useUploader();
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [sharing, setSharing] = useState(false);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader>
        <HeaderSearch
          id="q2"
          label="検索"
          placeholder="このアルバム内を検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <AccountMenu user={user} />
      </AppHeader>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-7 pb-16 max-sm:px-4">
        <div className="flex flex-col gap-3.5">
          <Link
            href="/"
            className="inline-flex min-h-8 items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-link-hover"
          >
            <ChevronLeftIcon className="size-4" />
            アルバム
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-[32px] font-bold tracking-[-0.02em]">{album.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{summary.join(" · ")}</span>
                {shareLink?.active && (
                  <span className="flex items-center">
                    <span className="flex size-[26px] items-center justify-center rounded-full border-2 border-background bg-avatar text-[11px] font-semibold text-foreground">
                      {userInitial(user)}
                    </span>
                    <span className="ml-2">リンクで共有中</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="surface" size="pill" className="font-semibold" onClick={() => setSharing(true)}>
                <Share2Icon />
                共有
              </Button>
              <Button
                size="pill"
                className="font-semibold"
                disabled={uploader.running}
                onClick={() => fileInput.current?.click()}
              >
                <UploadIcon />
                写真を追加
              </Button>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="surface" size="icon-pill" aria-label="その他の操作">
                    <EllipsisIcon />
                  </Button>
                </DropdownMenuTrigger>
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
              </DropdownMenu>
            </div>
          </div>
        </div>

        {photos.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            まだ写真がありません。「写真を追加」から追加してください。
          </p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            「{query}」に一致する写真はありません
          </p>
        ) : (
          <PhotoGrid photos={visible} onOpen={(photo) => setOpenId(photo.id)} />
        )}
      </main>

      {openIndex >= 0 && (
        <Lightbox
          photos={visible}
          index={openIndex}
          canDownload
          owner
          paused={pendingDelete !== null}
          onIndexChange={(index) => setOpenId(visible[index].id)}
          onClose={() => setOpenId(null)}
          onToggleFavorite={toggleFavorite}
          onDelete={(photo) => setPendingDelete({ kind: "photo", photo })}
        />
      )}

      <ShareDialog
        open={sharing}
        onOpenChange={setSharing}
        albumId={album.id}
        albumTitle={album.title}
        user={user}
        link={shareLink}
      />
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
