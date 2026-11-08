import { Link, useRouter } from "@void/react";
import {
  CheckSquareIcon,
  ChevronLeftIcon,
  DownloadIcon,
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  FolderInputIcon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlbumTitleDialog, MovePhotosDialog } from "@/components/album-dialogs";
import { AccountLink } from "@/components/account-link";
import { AppHeader, HeaderSearch, MainNav } from "@/components/app-header";
import { DownloadStatus } from "@/components/download-status";
import { Lightbox } from "@/components/lightbox";
import { MobileFab } from "@/components/mobile-fab";
import { PhotoGrid } from "@/components/photo-grid";
import { type SelectionAction, SelectionBar } from "@/components/selection-bar";
import { ShareDialog } from "@/components/share-dialog";
import { IMAGE_ACCEPT, openPhotoPicker } from "@/components/upload-status";
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
import { usePhotoDownload } from "@/hooks/use-photo-download";
import { useUploader } from "@/hooks/use-uploader";
import { formatCount, formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Props } from "./[id].server";

type Photo = Props["photos"][number];
type PendingDelete = { kind: "album" } | { kind: "photo"; photo: Photo } | { kind: "selection" };

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
  moveTargets,
  avatars,
  shareLink,
  settings,
}: Props) {
  const router = useRouter();
  const uploader = useUploader();
  const downloader = usePhotoDownload(album.title);
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
  const [hiddenIds, setHiddenIds] = useState<Record<string, boolean>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [sharing, setSharing] = useState(startSharing);
  const [renaming, setRenaming] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [moving, setMoving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const all = useMemo(
    () =>
      photos.map((photo) => ({
        ...photo,
        favorite: favorites[photo.id] ?? photo.favorite,
        hidden: hiddenIds[photo.id] ?? photo.hidden,
      })),
    [photos, favorites, hiddenIds],
  );
  const hiddenCount = all.filter((photo) => photo.hidden).length;
  const shown = useMemo(() => (showHidden ? all : all.filter((photo) => !photo.hidden)), [all, showHidden]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return shown.filter(
        (photo) =>
          !needle ||
          photo.fileName.toLowerCase().includes(needle) ||
          photo.camera?.toLowerCase().includes(needle),
      );
  }, [shown, query]);

  // 検索や非表示の切り替えで見えなくなった写真は、選択していても操作しない
  const selected = visible.filter((photo) => selectedIds.has(photo.id));
  const selectedAllHidden = selected.length > 0 && selected.every((photo) => photo.hidden);

  const openIndex = visible.findIndex((photo) => photo.id === openId);
  const summary = [`${formatCount(shown.length)} 枚`];
  if (shown.length) summary.push(formatDateRange(shown[0].takenAt, shown[shown.length - 1].takenAt));
  if (hiddenCount && !showHidden) summary.push(`非表示 ${formatCount(hiddenCount)} 枚`);

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

  async function toggleHidden(photo: Photo) {
    const hidden = !photo.hidden;
    // 非表示の写真を出していないときは一覧から消えるので、拡大表示を隣の写真に移す
    if (hidden && !showHidden && photo.id === openId) {
      const next = visible[openIndex + 1] ?? visible[openIndex - 1];
      setOpenId(next?.id ?? null);
    }
    setHiddenIds((current) => ({ ...current, [photo.id]: hidden }));
    const response = await window.fetch(`/api/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    if (!response.ok) setHiddenIds((current) => ({ ...current, [photo.id]: photo.hidden }));
  }

  function select(list: Photo[], on: boolean) {
    setSelecting(true);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const photo of list) {
        if (on) next.add(photo.id);
        else next.delete(photo.id);
      }
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelectedIds(new Set());
    setBulkError(null);
  }

  async function runBulk(body: { action: "hide" | "show" | "delete" } | { action: "move"; targetAlbumId: string }) {
    const response = await window.fetch(`/api/albums/${album.id}/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, photoIds: selected.map((photo) => photo.id) }),
    });
    if (!response.ok) {
      const { message } = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(message ?? "操作できませんでした");
    }
    await router.refresh({ preserveScroll: true });
    // 拡大表示で切り替えた分が新しいデータより優先されないよう、手元の上書きを捨てる
    setFavorites({});
    setHiddenIds({});
    stopSelecting();
  }

  async function bulk(body: Parameters<typeof runBulk>[0]) {
    setBulkError(null);
    try {
      await runBulk(body);
    } catch (cause) {
      setBulkError(cause instanceof Error ? cause.message : "操作できませんでした");
    }
  }

  const selectionActions: SelectionAction[] = [
    { label: "保存", icon: DownloadIcon, onClick: () => void downloader.download(selected) },
    ...(isOwner
      ? [
          selectedAllHidden
            ? { label: "表示", icon: EyeIcon, onClick: () => void bulk({ action: "show" }) }
            : { label: "非表示", icon: EyeOffIcon, onClick: () => void bulk({ action: "hide" }) },
          { label: "移動", icon: FolderInputIcon, onClick: () => setMoving(true) },
        ]
      : []),
    ...(role !== "viewer"
      ? [
          {
            label: "削除",
            icon: Trash2Icon,
            destructive: true,
            disabled: !selected.every((photo) => photo.deletable),
            onClick: () => setPendingDelete({ kind: "selection" }),
          },
        ]
      : []),
  ];

  // 別の画面に移って戻ってきた場合も、このアルバムへの追加が終わったら一覧を読み直す
  const wasUploading = useRef(false);
  useEffect(() => {
    if (wasUploading.current && !uploader.running && uploader.albumId === album.id) {
      void router.refresh({ preserveScroll: true });
    }
    wasUploading.current = uploader.running;
  }, [uploader.running]);

  function addFiles(files: File[]) {
    if (files.length) void uploader.upload(album.id, files, settings);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "album") {
      await window.fetch(`/api/albums/${album.id}`, { method: "DELETE" });
      await router.visit("/");
      return;
    }
    if (pendingDelete.kind === "selection") {
      setPendingDelete(null);
      await bulk({ action: "delete" });
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
      {(hiddenCount > 0 || showHidden) && (
        <DropdownMenuItem onSelect={() => setShowHidden(!showHidden)}>
          {showHidden ? <EyeOffIcon /> : <EyeIcon />}
          {showHidden ? "非表示の写真を隠す" : `非表示の写真を表示 (${hiddenCount})`}
        </DropdownMenuItem>
      )}
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
        <div className="flex flex-none">
          {photos.length > 0 && (
            <button
              type="button"
              aria-label="写真を選択"
              aria-pressed={selecting}
              onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
              className="flex size-11 cursor-pointer items-center justify-center"
            >
              <CheckSquareIcon className="size-5" />
            </button>
          )}
          {isOwner ? (
            <>
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
            </>
          ) : (
            photos.length === 0 && <span aria-hidden="true" className="w-11 flex-none" />
          )}
        </div>
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

      <main className={cn("mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-7 pb-16 max-md:gap-0 max-md:px-0 max-md:pt-0 max-md:pb-24", selecting && "pb-28" && "max-md:pb-40")}>
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
              {photos.length > 0 && (
                <Button
                  variant="surface"
                  size="pill"
                  className="font-semibold"
                  aria-pressed={selecting}
                  onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                >
                  <CheckSquareIcon />
                  {selecting ? "選択をやめる" : "選択"}
                </Button>
              )}
              {canAdd && !selecting && (
                <Button
                  size="pill"
                  className="font-semibold"
                  disabled={uploader.running}
                  onClick={() => openPhotoPicker(fileInput.current)}
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
                  addFiles([...(event.target.files ?? [])]);
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
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground max-md:px-4">
            <p>すべての写真を非表示にしています。</p>
            <Button variant="surface" size="pill" onClick={() => setShowHidden(true)}>
              <EyeIcon />
              非表示の写真を表示
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground max-md:px-4">
            「{query}」に一致する写真はありません
          </p>
        ) : (
          <PhotoGrid
            photos={visible}
            onOpen={(photo) => setOpenId(photo.id)}
            selecting={selecting}
            selectedIds={selectedIds}
            onSelect={select}
          />
        )}
      </main>

      {canAdd && !selecting && (
        <MobileFab
          aria-label="写真を追加"
          className="bottom-8"
          disabled={uploader.running}
          onClick={() => openPhotoPicker(fileInput.current)}
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
          onToggleHidden={isOwner ? toggleHidden : undefined}
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
              {pendingDelete?.kind === "album"
                ? "アルバムを削除しますか？"
                : pendingDelete?.kind === "selection"
                  ? `${selected.length} 枚の写真を削除しますか？`
                  : "写真を削除しますか？"}
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

      {selecting && (
        <SelectionBar
          count={selected.length}
          total={visible.length}
          actions={selectionActions}
          onSelectAll={(on) => select(visible, on)}
          onClose={stopSelecting}
        />
      )}
      {bulkError && (
        <p
          role="alert"
          className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-destructive px-4 py-2 text-sm text-white shadow-lg max-md:bottom-36"
        >
          {bulkError}
        </p>
      )}
      <DownloadStatus state={downloader.state} onShare={() => void downloader.share()} onDismiss={downloader.dismiss} />
      {isOwner && (
        <MovePhotosDialog
          open={moving}
          onOpenChange={setMoving}
          count={selected.length}
          albums={moveTargets}
          onSubmit={(targetAlbumId) => runBulk({ action: "move", targetAlbumId })}
        />
      )}

    </div>
  );
}
