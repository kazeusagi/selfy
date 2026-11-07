import exifr from "exifr";

const DISPLAY_MAX_EDGE = 2048;
const THUMB_MIN_EDGE = 480;
const REDUCED_ORIGINAL_MAX_EDGE = 4000;
const QUALITY = 0.85;

const TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

function originalType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const known = Object.values(TYPES_BY_EXTENSION);
  // OSによっては HEIC の file.type が空になる
  const type = known.includes(file.type) ? file.type : TYPES_BY_EXTENSION[extension];
  if (!type) throw new Error("対応していない形式です");
  return type;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalString(date: Date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function formatShutter(seconds: number) {
  return seconds >= 1 ? `${seconds}s` : `1/${Math.round(1 / seconds)}s`;
}

function describeExposure(exif: Record<string, any>) {
  const settings = [
    exif.FNumber && `ƒ/${exif.FNumber}`,
    exif.ExposureTime && formatShutter(exif.ExposureTime),
    exif.ISO && `ISO ${exif.ISO}`,
  ].filter(Boolean);
  return settings.length ? settings.join(" · ") : null;
}

function describeCamera(exif: Record<string, any>) {
  const make = typeof exif.Make === "string" ? exif.Make.trim() : "";
  const model = typeof exif.Model === "string" ? exif.Model.trim() : "";
  // "Apple" + "iPhone 17 Pro" のように Model にメーカー名がないものだけ連結する
  const camera = model.toLowerCase().includes(make.toLowerCase()) || make === "Apple"
    ? model
    : `${make} ${model}`;
  return camera.trim() || null;
}

async function encode(bitmap: ImageBitmap, scale: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  // Safari は WebP を書き出せず PNG で返すので JPEG にする
  const webp = await toBlob("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await toBlob("image/jpeg");
  if (!blob) throw new Error("画像を変換できませんでした");
  return blob;
}

async function decode(file: File, type: string) {
  if (type !== "image/heic" && type !== "image/heif") {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  // HEIC のデコーダは大きいので、必要なときだけ読み込む
  const { heicTo } = await import("heic-to");
  const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
  return createImageBitmap(jpeg, { imageOrientation: "from-image" });
}

function withExtension(fileName: string, type: string) {
  return fileName.replace(/(\.[^.]+)?$/, type === "image/webp" ? ".webp" : ".jpg");
}

async function buildUpload(file: File, keepOriginal: boolean) {
  const type = originalType(file);
  const exif: Record<string, any> = (await exifr.parse(file).catch(() => null)) ?? {};
  const bitmap = await decode(file, type);

  try {
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const shortEdge = Math.min(bitmap.width, bitmap.height);
    const display = await encode(bitmap, Math.min(1, DISPLAY_MAX_EDGE / longEdge));
    const thumb = await encode(bitmap, Math.min(1, THUMB_MIN_EDGE / shortEdge));
    const taken = exif.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal : new Date(file.lastModified);
    const scale = keepOriginal ? 1 : Math.min(1, REDUCED_ORIGINAL_MAX_EDGE / longEdge);
    const reduced = scale < 1 ? await encode(bitmap, scale) : null;
    const fileName = reduced ? withExtension(file.name, reduced.type) : file.name;

    const form = new FormData();
    form.set("original", new File([reduced ?? file], fileName, { type: reduced?.type ?? type }));
    form.set("display", display);
    form.set("thumb", thumb);
    form.set(
      "meta",
      JSON.stringify({
        fileName,
        width: Math.round(bitmap.width * scale),
        height: Math.round(bitmap.height * scale),
        takenAt: toLocalString(taken),
        latitude: Number.isFinite(exif.latitude) ? exif.latitude : null,
        longitude: Number.isFinite(exif.longitude) ? exif.longitude : null,
        camera: describeCamera(exif),
        exposure: describeExposure(exif),
      }),
    );
    return form;
  } finally {
    bitmap.close();
  }
}

export async function uploadPhoto(albumId: string, file: File, keepOriginal: boolean) {
  const body = await buildUpload(file, keepOriginal);
  const response = await window.fetch(`/api/albums/${albumId}/photos`, { method: "POST", body });
  if (!response.ok) throw new Error(`アップロードに失敗しました（${response.status}）`);
}
