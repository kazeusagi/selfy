import { useState } from "react";
import { canShareFiles, fetchOriginals, isAndroid, saveAsZip, saveEach, savePhoto } from "@/lib/download";

export type DownloadState =
  | { kind: "idle" }
  | { kind: "fetching"; done: number; total: number }
  | { kind: "ready"; files: File[] }
  | { kind: "error"; message: string };

type Photo = { id: string; fileName: string };

// 複数枚は、iPhone なら共有シートで写真アプリへ、Android なら1枚ずつ、PC なら ZIP にまとめて保存する
export function usePhotoDownload(zipName: string) {
  const [state, setState] = useState<DownloadState>({ kind: "idle" });

  async function zip(files: File[]) {
    await saveAsZip(files, `${zipName}.zip`);
    setState({ kind: "idle" });
  }

  async function download(photos: Photo[]) {
    if (photos.length === 0 || state.kind === "fetching") return;
    if (photos.length === 1) {
      savePhoto(photos[0]);
      return;
    }
    setState({ kind: "fetching", done: 0, total: photos.length });
    try {
      const files = await fetchOriginals(photos, (done) => setState({ kind: "fetching", done, total: photos.length }));
      // 取得を待つ間にタップの効力が切れて共有シートを開けないので、もう一度押してもらう
      if (isAndroid()) {
        await saveEach(files);
        setState({ kind: "idle" });
      } else if (canShareFiles(files)) setState({ kind: "ready", files });
      else await zip(files);
    } catch (cause) {
      setState({ kind: "error", message: cause instanceof Error ? cause.message : "ダウンロードできませんでした" });
    }
  }

  async function share() {
    if (state.kind !== "ready") return;
    try {
      await navigator.share({ files: state.files });
      setState({ kind: "idle" });
    } catch (cause) {
      // 共有シートを閉じただけなら、もう一度押せるように残す
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      try {
        await zip(state.files);
      } catch (zipError) {
        setState({ kind: "error", message: zipError instanceof Error ? zipError.message : "保存できませんでした" });
      }
    }
  }

  return { state, download, share, dismiss: () => setState({ kind: "idle" }) };
}
