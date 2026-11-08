import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchExistingHashes, hashFile, originalType, uploadPhoto } from "@/lib/upload";

// 変換はブラウザのメモリを多く使うので同時に2枚まで
const CONCURRENCY = 2;

export type UploadFailure = { name: string; message: string };
export type UploadSettings = { keepOriginal: boolean; wifiOnly: boolean };

// 回線の種類がわかるのは一部のブラウザだけで、iOS の Safari などでは判定できない
export function blockedOnCellular({ wifiOnly }: UploadSettings) {
  const { connection } = navigator as Navigator & { connection?: { type?: string } };
  return wifiOnly && connection?.type === "cellular";
}

export const CELLULAR_MESSAGE = "モバイル通信中はアップロードしません（設定で変更できます）";

// 画面を移ってもアップロードを続けられるよう、状態はレイアウトの UploaderProvider に1つだけ持つ
export function useUploadQueue() {
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [finished, setFinished] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const running = finished < total;

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const upload = useCallback(async (albumId: string, files: File[], settings: UploadSettings) => {
    setAlbumId(albumId);
    setTotal(files.length);
    setFinished(0);
    setSkipped(0);
    setFailures([]);

    if (blockedOnCellular(settings)) {
      setFinished(files.length);
      setFailures(files.map((file) => ({ name: file.name, message: CELLULAR_MESSAGE })));
      return;
    }

    // 選んだ中での重複も弾けるよう、追加したものもこの集合に足していく
    let seen: Set<string>;
    try {
      seen = await fetchExistingHashes(albumId);
    } catch (error) {
      setFinished(files.length);
      const message = error instanceof Error ? error.message : "アップロードに失敗しました";
      setFailures(files.map((file) => ({ name: file.name, message })));
      return;
    }

    const queue = [...files];
    const worker = async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          // 写真以外のファイルを読み込んでハッシュを取る前に弾く
          originalType(file);
          const hash = await hashFile(file);
          if (seen.has(hash)) {
            setSkipped((count) => count + 1);
          } else {
            seen.add(hash);
            const added = await uploadPhoto(albumId, file, settings.keepOriginal, hash);
            if (!added) setSkipped((count) => count + 1);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "アップロードに失敗しました";
          setFailures((list) => [...list, { name: file!.name, message }]);
        }
        setFinished((count) => count + 1);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }, []);

  const dismiss = useCallback(() => {
    setTotal(0);
    setFinished(0);
    setSkipped(0);
    setFailures([]);
  }, []);

  return { albumId, total, finished, skipped, failures, running, upload, dismiss };
}

export type Uploader = ReturnType<typeof useUploadQueue>;

export const UploaderContext = createContext<Uploader | null>(null);

export function useUploader() {
  const uploader = useContext(UploaderContext);
  if (!uploader) throw new Error("UploaderProvider の中で使ってください");
  return uploader;
}
