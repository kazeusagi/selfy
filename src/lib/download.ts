import { photoUrl } from "@/lib/photo-url";
import { createZip } from "@/lib/zip";

const CONCURRENCY = 4;

// 同じ名前が並ぶと ZIP や共有先で上書きされるので、2つ目から番号を付ける
function uniqueNames(names: string[]) {
  const used = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    const dot = name.lastIndexOf(".");
    const [base, extension] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${extension}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

export async function fetchOriginals(
  photos: { id: string; fileName: string }[],
  onProgress: (done: number) => void,
) {
  const names = uniqueNames(photos.map((photo) => photo.fileName));
  const files: File[] = new Array(photos.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < photos.length) {
      const index = next++;
      const response = await window.fetch(photoUrl(photos[index].id, "original"));
      if (!response.ok) throw new Error("写真を取得できませんでした");
      const blob = await response.blob();
      files[index] = new File([blob], names[index], { type: blob.type });
      onProgress(++done);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, photos.length) }, worker));
  return files;
}

export function saveFile(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function savePhoto(photo: { id: string; fileName: string }) {
  const link = document.createElement("a");
  link.href = photoUrl(photo.id, "original");
  link.download = photo.fileName;
  link.click();
}

// Android の共有シートには「画像を保存」がなく、送り先のアプリしか出ない
export function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

// 続けて押すとブラウザが取りこぼすことがあるので、少し間を空ける
export async function saveEach(files: File[]) {
  for (const file of files) {
    saveFile(file, file.name);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

// iPhone では共有シートから写真アプリに保存できる。PC は ZIP のほうが扱いやすい
export function canShareFiles(files: File[]) {
  return (
    !isAndroid() &&
    window.matchMedia("(pointer: coarse)").matches &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

export async function saveAsZip(files: File[], name: string) {
  saveFile(await createZip(files.map((file) => ({ name: file.name, data: file }))), name);
}
