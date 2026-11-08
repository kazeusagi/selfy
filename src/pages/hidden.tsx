import { Link } from "@void/react";
import { ChevronLeftIcon, DownloadIcon, EyeIcon, LockIcon } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { UploadDialog } from "@/components/album-dialogs";
import { BottomNav } from "@/components/bottom-nav";
import { DownloadStatus } from "@/components/download-status";
import { Lightbox } from "@/components/lightbox";
import { MainHeader } from "@/components/main-header";
import { PhotoFilterButton, usePhotoFilter } from "@/components/photo-filter";
import { PhotoGrid } from "@/components/photo-grid";
import { type SelectionAction, SelectionBar } from "@/components/selection-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePhotoDownload } from "@/hooks/use-photo-download";
import { formatCount } from "@/lib/format";
import type { Props } from "./hidden.server";

type HiddenPhoto = {
  id: string;
  albumId: string;
  albumTitle: string;
  fileName: string;
  takenAt: string;
  width: number;
  height: number;
  originalBytes: number;
  latitude: number | null;
  longitude: number | null;
  camera: string | null;
  exposure: string | null;
  favorite: boolean;
  addedBy: string;
};

// HTTPException の message は本文にそのまま入って返る
async function readError(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  return text && text.length < 200 ? text : fallback;
}

function PasswordForm({ hasPassword, onUnlock }: { hasPassword: boolean; onUnlock: (photos: HiddenPhoto[]) => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!hasPassword && password !== confirm) {
      setError("確認用のパスワードが一致しません");
      return;
    }
    setPending(true);
    try {
      if (!hasPassword) {
        const response = await window.fetch("/api/hidden/password", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!response.ok) throw new Error(await readError(response, "パスワードを設定できませんでした"));
      }
      const response = await window.fetch("/api/hidden", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error(await readError(response, "開けませんでした"));
      const { photos } = (await response.json()) as { photos: HiddenPhoto[] };
      onUnlock(photos);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "開けませんでした");
      setPassword("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-[360px] flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-linear-135 from-[#3f3d56] via-[#6b5b95] to-[#c39bd3]">
        <LockIcon className="size-7 text-white" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">非表示の写真</h1>
        <p className="text-sm text-muted-foreground">
          {hasPassword
            ? "パスワードを入力すると表示します"
            : "開くときのパスワードを決めてください。ログインとは別のパスワードです"}
        </p>
      </div>
      <Input
        type="password"
        aria-label="パスワード"
        placeholder="パスワード"
        autoComplete={hasPassword ? "current-password" : "new-password"}
        autoFocus
        required
        minLength={hasPassword ? undefined : 4}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="h-11 rounded-xl"
      />
      {!hasPassword && (
        <Input
          type="password"
          aria-label="パスワード（確認）"
          placeholder="もう一度入力"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="h-11 rounded-xl"
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="pill" className="w-full font-semibold" disabled={pending || !password}>
        {hasPassword ? "開く" : "設定して開く"}
      </Button>
    </form>
  );
}

export default function HiddenPage({ user, hasPassword, albumOptions, settings }: Props) {
  const [photos, setPhotos] = useState<HiddenPhoto[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const photoFilter = usePhotoFilter();
  const downloader = usePhotoDownload("非表示");

  const visible = useMemo(() => photoFilter.apply(photos ?? []), [photos, photoFilter.filter]);
  const selected = visible.filter((photo) => selectedIds.has(photo.id));
  const openIndex = visible.findIndex((photo) => photo.id === openId);

  function select(list: HiddenPhoto[], on: boolean) {
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
  }

  async function patch(id: string, body: { favorite?: boolean; hidden?: boolean }) {
    const response = await window.fetch(`/api/photos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  }

  async function unhide(list: HiddenPhoto[]) {
    setError(null);
    const ids = new Set(list.map((photo) => photo.id));
    // 拡大中の写真を戻したら、同じ位置に来る次の写真を開く
    if (openId && ids.has(openId)) {
      const rest = visible.filter((photo) => !ids.has(photo.id));
      setOpenId(rest[Math.min(openIndex, rest.length - 1)]?.id ?? null);
    }
    const results = await Promise.all(
      list.map(async (photo) => ({ id: photo.id, ok: await patch(photo.id, { hidden: false }) })),
    );
    const done = new Set(results.filter((result) => result.ok).map((result) => result.id));
    setPhotos((current) => current?.filter((photo) => !done.has(photo.id)) ?? null);
    if (done.size < list.length) setError("一部の写真を戻せませんでした");
    stopSelecting();
  }

  async function toggleFavorite(photo: HiddenPhoto) {
    const favorite = !photo.favorite;
    const update = (value: boolean) =>
      setPhotos(
        (current) => current?.map((item) => (item.id === photo.id ? { ...item, favorite: value } : item)) ?? null,
      );
    update(favorite);
    if (!(await patch(photo.id, { favorite }))) update(!favorite);
  }

  const actions: SelectionAction[] = [
    { label: "保存", icon: DownloadIcon, onClick: () => void downloader.download(selected) },
    { label: "表示に戻す", icon: EyeIcon, onClick: () => void unhide(selected) },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MainHeader
        user={user}
        current="albums"
        onUpload={() => setUploading(true)}
        filter={
          photos && (
            <PhotoFilterButton
              filter={photoFilter.filter}
              onChange={photoFilter.setFilter}
              className="border border-border bg-card"
            />
          )
        }
      />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-7 px-8 pt-7 pb-16 max-md:gap-0 max-md:px-0 max-md:pt-0 max-md:pb-[120px]">
        <Link
          href="/"
          className="inline-flex min-h-8 items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-link-hover max-md:px-4 max-md:pt-4"
        >
          <ChevronLeftIcon className="size-4" />
          アルバム
        </Link>
        {photos === null ? (
          <div className="max-md:px-4">
            <PasswordForm hasPassword={hasPassword} onUnlock={setPhotos} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4 max-md:px-4 max-md:pt-3 max-md:pb-2">
              <div className="flex flex-col gap-2">
                <h1 className="text-[32px] font-bold tracking-[-0.02em] max-md:text-[26px]">非表示</h1>
                <span className="text-sm text-muted-foreground max-md:text-[13px]">
                  {formatCount(visible.length)} 枚 · あなたにだけ見えています
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PhotoFilterButton filter={photoFilter.filter} onChange={photoFilter.setFilter} className="md:hidden" />
                {photos.length > 0 && (
                  <Button
                    variant="surface"
                    size="pill"
                    className="font-semibold"
                    onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                  >
                    {selecting ? "選択をやめる" : "選択"}
                  </Button>
                )}
                <Button variant="surface" size="pill" className="font-semibold" onClick={() => setPhotos(null)}>
                  <LockIcon />
                  ロック
                </Button>
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {photos.length
                  ? "条件に一致する写真はありません"
                  : "非表示の写真はありません。アルバムで写真を選んで「非表示」にすると、ここに移ります。"}
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
          </>
        )}
      </main>

      {openIndex >= 0 && (
        <Lightbox
          photos={visible.map((photo) => ({ ...photo, hidden: true }))}
          index={openIndex}
          canDownload
          onIndexChange={(index) => setOpenId(visible[index].id)}
          onClose={() => setOpenId(null)}
          onToggleFavorite={(photo) => void toggleFavorite(photo)}
          onToggleHidden={(photo) => void unhide([photo])}
        />
      )}
      {selecting && (
        <SelectionBar
          count={selected.length}
          total={visible.length}
          actions={actions}
          onSelectAll={(on) => select(visible, on)}
          onClose={stopSelecting}
        />
      )}
      {error && (
        <p
          role="alert"
          className="fixed inset-x-0 bottom-24 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-destructive px-4 py-2 text-sm text-white shadow-lg max-md:bottom-36"
        >
          {error}
        </p>
      )}
      <DownloadStatus state={downloader.state} onShare={() => void downloader.share()} onDismiss={downloader.dismiss} />
      {!selecting && <BottomNav current="albums" />}
      <UploadDialog open={uploading} onOpenChange={setUploading} albums={albumOptions} settings={settings} />
    </div>
  );
}
