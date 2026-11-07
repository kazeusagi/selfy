import { defineHandler, defineHead } from "void";
import type { InferProps } from "void";
import { getUser } from "void/auth";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler((c) => {
  if (getUser()) return c.redirect("/");
  return { linkError: c.req.query("error") !== undefined };
});

export const head = defineHead(() => ({ title: "ログイン" }));
