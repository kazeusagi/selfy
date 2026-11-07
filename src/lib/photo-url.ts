export type PhotoVariant = "thumb" | "display" | "original";

export function photoUrl(id: string, variant: PhotoVariant, shareToken?: string) {
  const path = `/api/photos/${id}/${variant}`;
  return shareToken ? `${path}?share=${encodeURIComponent(shareToken)}` : path;
}
