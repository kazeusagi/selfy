import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";

export type Props = Exclude<InferProps<typeof loader>, Response>;

export const loader = defineHandler((c) => {
  const user = getUser();
  if (!user) return c.redirect("/login");
  return { user: { name: user.name, email: user.email } };
});

export const head = defineHead(() => ({ title: "設定" }));
