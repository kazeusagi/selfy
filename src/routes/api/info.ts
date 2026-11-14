import { defineHandler } from "void";

// アプリが接続先を登録するとき、入力されたドメインが Selfy かどうかをログイン前に確かめる
export const GET = defineHandler(() => ({ app: "selfy" }));
