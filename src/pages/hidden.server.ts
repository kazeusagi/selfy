import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";
import { listWritableAlbums } from "@/server/access";
import { hasHiddenPassword } from "@/server/hidden-password";
import { getUserSettings } from "@/server/settings";
import { accountOf } from "@/server/users";

export type Props = Exclude<InferProps<typeof loader>, Response>;

// 写真はここでは渡さず、パスワードを確かめてから API で返す
export const loader = defineHandler(async (c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");

  const [hasPassword, albumOptions, settings] = await Promise.all([
    hasHiddenPassword(user.id),
    listWritableAlbums(user),
    getUserSettings(user.id),
  ]);

  return { user: accountOf(user), hasPassword, albumOptions, settings };
});

export const head = defineHead(() => ({ title: "非表示", meta: [{ name: "robots", content: "noindex" }] }));
