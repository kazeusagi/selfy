import { useCallback, useEffect, useState } from "react";
import { uploadPhoto } from "@/lib/upload";

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

export function useUploader(settings: UploadSettings) {
  const [total, setTotal] = useState(0);
  const [finished, setFinished] = useState(0);
  const [failures, setFailures] = useState<UploadFailure[]>([]);
  const running = finished < total;

  useEffect(() => {
    if (!running) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const upload = useCallback(async (albumId: string, files: File[]) => {
    setTotal(files.length);
    setFinished(0);
    setFailures([]);

    if (blockedOnCellular(settings)) {
      setFinished(files.length);
      setFailures(files.map((file) => ({ name: file.name, message: CELLULAR_MESSAGE })));
      return;
    }

    const queue = [...files];
    const worker = async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        try {
          await uploadPhoto(albumId, file, settings.keepOriginal);
        } catch (error) {
          const message = error instanceof Error ? error.message : "アップロードに失敗しました";
          setFailures((list) => [...list, { name: file!.name, message }]);
        }
        setFinished((count) => count + 1);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }, [settings]);

  const dismiss = useCallback(() => {
    setTotal(0);
    setFinished(0);
    setFailures([]);
  }, []);

  return { total, finished, failures, running, upload, dismiss };
}
