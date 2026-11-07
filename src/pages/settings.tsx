import { PlaceholderPage } from "@/components/placeholder-page";
import type { Props } from "./settings.server";

export default function SettingsPage({ user }: Props) {
  return <PlaceholderPage title="設定" current="settings" user={user} />;
}
