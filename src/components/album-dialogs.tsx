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
import { useUploader } from "@/hooks/use-uploader";
import { IMAGE_ACCEPT } from "@/components/upload-status";

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
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
  heading: string;
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
      <DialogContent className="rounded-[20px] p-6 sm:max-w-md">
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{heading}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="album-title" className="text-[13px] font-medium">
              アルバム名
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albums: { id: string; title: string }[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const uploader = useUploader();
  const [target, setTarget] = useState(albums[0]?.id ?? NEW_ALBUM);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const creating = target === NEW_ALBUM;

  async function start(files: File[]) {
    if (!files.length) return;
    setError(null);
    try {
      const albumId = creating ? (await createAlbum(title.trim())).id : target;
      await uploader.upload(albumId, files);
      await router.visit(`/albums/${albumId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "アップロードに失敗しました");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !uploader.running && onOpenChange(next)}>
      <DialogContent className="flex flex-col gap-5 rounded-[20px] p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">写真をアップロード</DialogTitle>
          <DialogDescription>追加先のアルバムを選んでください。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="upload-target" className="text-[13px] font-medium">
            アルバム
          </label>
          <Select value={target} onValueChange={setTarget} disabled={uploader.running}>
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
            disabled={uploader.running || (creating && !title.trim())}
            onClick={() => input.current?.click()}
          >
            {uploader.running
              ? `${uploader.finished} / ${uploader.total} 枚を処理中`
              : "写真を選ぶ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
