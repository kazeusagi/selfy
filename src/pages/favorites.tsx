import { PlaceholderPage } from "@/components/placeholder-page";
import type { Props } from "./favorites.server";

export default function FavoritesPage({ user }: Props) {
  return <PlaceholderPage title="お気に入り" current="favorites" user={user} />;
}
