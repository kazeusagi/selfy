import { useRouter } from "@void/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { blockedOnCellular, CELLULAR_MESSAGE, type UploadSettings, useUploader } from "@/hooks/use-uploader";
import { IMAGE_ACCEPT, openPhotoPicker } from "@/components/upload-status";

async function createAlbum(title: string) {
  const response = await window.fetch("/api/albums", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw new Error("アルバムを作成できませんでした");
  return (await response.json()) as { id: string };
}

export function AlbumTitleDialog({
  open,
  onOpenChange,
  initialTitle = "",
  heading,
  label = "アルバム名",
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
  heading: string;
  label?: string;
  submitLabel: string;
  onSubmit: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setError(null);
    }
  }, [open, initialTitle]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await onSubmit(title.trim());
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存できませんでした");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px] p-6 md:max-w-md">
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{heading}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="album-title" className="text-[13px] font-medium">
              {label}
            </label>
            <Input
              id="album-title"
              required
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-xl px-3.5"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="pill" disabled={pending || !title.trim()} className="font-semibold">
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewAlbumDialog(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  return (
    <AlbumTitleDialog
      {...props}
      heading="新しいアルバム"
      submitLabel="作成"
      onSubmit={async (title) => {
        const album = await createAlbum(title);
        await router.visit(`/albums/${album.id}`);
      }}
    />
  );
}

const NEW_ALBUM = "new";

export function UploadDialog({
  open,
  onOpenChange,
  albums,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albums: { id: string; title: string }[];
  settings: UploadSettings;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const uploader = useUploader();
  const [pending, setPending] = useState(false);
  const [target, setTarget] = useState(albums[0]?.id ?? NEW_ALBUM);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const creating = target === NEW_ALBUM;

  async function start(files: File[]) {
    if (!files.length) return;
    if (blockedOnCellular(settings)) {
      setError(CELLULAR_MESSAGE);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const albumId = creating ? (await createAlbum(title.trim())).id : target;
      // 終わるのを待たずに移動し、進み具合はレイアウトの表示で見せる
      void uploader.upload(albumId, files, settings);
      onOpenChange(false);
      await router.visit(`/albums/${albumId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "アップロードに失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="flex flex-col gap-5 rounded-[20px] p-6 md:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">写真をアップロード</DialogTitle>
          <DialogDescription>追加先のアルバムを選んでください。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="upload-target" className="text-[13px] font-medium">
            アルバム
          </label>
          <Select value={target} onValueChange={setTarget} disabled={pending}>
            <SelectTrigger id="upload-target" className="w-full data-[size=default]:h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {albums.map((album) => (
                <SelectItem key={album.id} value={album.id}>
                  {album.title}
                </SelectItem>
              ))}
              <SelectItem value={NEW_ALBUM}>新しいアルバムを作成</SelectItem>
            </SelectContent>
          </Select>
          {creating && (
            <Input
              aria-label="アルバム名"
              placeholder="アルバム名"
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 h-11 rounded-xl px-3.5"
            />
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <input
          ref={input}
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          hidden
          onChange={(event) => {
            void start([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
          <Button
            size="pill"
            className="font-semibold"
            disabled={pending || uploader.running || (creating && !title.trim())}
            onClick={() => openPhotoPicker(input.current)}
          >
            {uploader.running ? "ほかの写真をアップロード中です" : "写真を選ぶ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MovePhotosDialog({
  open,
  onOpenChange,
  count,
  albums,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  albums: { id: string; title: string }[];
  onSubmit: (albumId: string) => Promise<void>;
}) {
  const [target, setTarget] = useState(albums[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTarget((current) => (albums.some((album) => album.id === current) ? current : (albums[0]?.id ?? "")));
      setError(null);
    }
  }, [open, albums]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    setPending(true);
    setError(null);
    try {
      await onSubmit(target);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "移動できませんでした");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="flex flex-col gap-5 rounded-[20px] p-6 md:max-w-md">
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{count} 枚の写真を移動</DialogTitle>
            <DialogDescription>移動先のアルバムを選んでください。移動できるのは自分のアルバムだけです。</DialogDescription>
          </DialogHeader>
          {albums.length === 0 ? (
            <p className="text-sm text-muted-foreground">移動先にできるアルバムがありません。先にアルバムを作成してください。</p>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="move-target" className="text-[13px] font-medium">
                アルバム
              </label>
              <Select value={target} onValueChange={setTarget} disabled={pending}>
                <SelectTrigger id="move-target" className="w-full data-[size=default]:h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((album) => (
                    <SelectItem key={album.id} value={album.id}>
                      {album.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
            <Button type="submit" size="pill" className="font-semibold" disabled={pending || !target}>
              移動
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
