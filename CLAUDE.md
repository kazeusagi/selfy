# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 概要

Selfy は Cloudflare Workers 上で動く、少人数向けのセルフホスト型写真ストレージです。
[Void](https://void.cloud) (Vite ベースのフルスタックフレームワーク) で作られていて、D1 にデータ、R2 に画像を保存します。
Void の API で迷ったら、推測せず `node_modules/void/docs/` を読んでください。

## コマンド

```sh
bun install
bun run dev                 # 開発サーバー (http://localhost:5173)。D1 のマイグレーションは起動時に適用される
bun run build               # 本番ビルド
bunx tsc --noEmit -p .      # 型チェック
bunx void env check         # .env が src/env.ts のスキーマを満たしているか確認
bunx void db generate       # src/db/schema.ts の変更からマイグレーションを生成 (src/db/migrations/)
SELFY_DOMAIN=<domain> bunx void deploy --platform cloudflare
```

テストとリンターはありません。変更の確認は型チェックと、開発サーバーを実際に動かして行います。

開発中のメール (ログインリンクと確認コード) は送信されず、起動時にターミナルに表示される `/__void/inbox?token=...` に届きます。

## 設定と環境変数

- 実行時の値は `src/env.ts` で宣言し、`import { env } from "void/env"` で読みます。ローカルは `.env` (`.env.example` から作る)、本番は `bunx void secret put <NAME>` で設定します。
  - `RESEND_API_KEY`: 本番のメール送信に使います。開発中はダミーで構いません
  - `ADMIN_EMAIL`: 管理者のメールアドレスです
  - `EMAIL_FROM`: メールの送信元アドレスです
- `SELFY_DOMAIN` だけはデプロイ時に `void.config.ts` が `process.env` から読みます。`.env` ではなくコマンドの環境変数で渡してください。未設定だと `*.workers.dev` で公開され、独自ドメインが外れます。
- `void.lock.json` はデプロイ先のリソース ID を持つ環境ごとのファイルなので、`.gitignore` に入れてあります。消さないでください。
- `.github/workflows/void-deploy.yml` は、存在しないブランチ `not` を対象にして意図的に無効化してあります。頼まれない限り直さないでください。

## アーキテクチャ

### ルーティング (`src/` 配下、Void のファイルベースルーティング)

- `pages/*.tsx`: サーバーレンダリングされる React ページです。同名の `*.server.ts` の `loader` (Hono のハンドラー) がデータを読み、`InferProps<typeof loader>` で型を付けた props としてページに渡します。未ログインのときは loader が `/login` にリダイレクトします。
- `routes/api/**`: JSON API です。`defineHandler` で書き、入力は `defineHandler.withValidator({ body })` と zod で検証します。ページからは `window.fetch` で呼びます。
- `server/`: ページと API で共有するサーバー側のロジックです (権限、許可リスト、メール、設定)。
- DB は `void/db` の Drizzle を使い、テーブルは `@schema` (`src/db/schema.ts`) から import します。

### 認証と許可リスト (`src/auth.ts`, `src/server/allowed-emails.ts`)

- Better Auth を使い、ログインはパスキー・マジックリンク・メールの確認コードだけです。パスワードは無効にしてあります。
- 登録とログインは招待制です。`ADMIN_EMAIL` と `allowed_emails` テーブルにあるアドレスだけが通ります。確認は、ユーザー作成とセッション作成の両方の DB フックで行います。メールを送る時点の確認だけでは、リンクを発行したあとに許可を外されたケースを防げないためです。
- 管理者の判定は `isAdmin` (`ADMIN_EMAIL` との比較) で、管理者用 API は `requireAdmin` を通します。

### アルバムの権限 (`src/server/access.ts`)

- 役割は `owner` / `contributor` / `viewer` の3つです。メンバーは未登録の人も招待できるよう、ユーザー ID ではなくメールアドレス (小文字) で `album_members` に持ちます。
- アルバムに触る処理は `findAlbumAccess` / `requireOwnedAlbum` / `accessibleAlbums` を通して権限を確認します。contributor が削除できるのは、自分が追加した写真だけです (`canDeletePhoto`)。
- お気に入りと、オーナー以外の人の非表示は人ごとなので `photo_marks` (ユーザー × 写真) に持ちます。閲覧のみの人もお気に入りと非表示ができます。
- オーナーが非表示にした写真は `photos.hidden` に入り、招待された人や共有リンクからも隠します。オーナー以外の人の非表示は `photo_marks.hidden` で、その人にだけ効きます。どちらも枚数や日付には数えませんが、保存容量には含めます。条件は `isShown` / `isHiddenBy` (`src/server/access.ts`) を使います。
- 自分が非表示にした写真は、アルバム一覧の「非表示」(`/hidden`) にまとまります。ログインとは別のパスワード (`user_settings.hidden_password`、PBKDF2) を入れると、`POST /api/hidden` が一覧を返します。ページを開き直すたびに入れ直す作りで、Cookie には残しません。
- ユーザーのアイコンは R2 の `avatars/<userId>` に置き、Better Auth の `user.image` に `/api/users/<id>/avatar?v=...` を入れます。`image` は本人が自由に書き換えられるので、表示には `avatarOf` で自前の URL だけを通します。
- 共有リンク (`share_links`、ページは `/s/[token]`) はログインなしで見られます。画像の取得には `?share=<token>` を付けます。

### 写真のアップロードと配信

- 変換はブラウザ側で行います (`src/lib/upload.ts`, `src/hooks/use-uploader.ts`)。EXIF の読み取り (exifr)、HEIC のデコード (heic-to)、表示用とサムネイルの生成 (WebP、Safari では JPEG) をしてから、元画像と一緒に `POST /api/albums/[id]/photos` へ送ります。ユーザー設定の `keepOriginal` がオフなら、元画像も縮小してから送ります。
- R2 には1枚につき `original` / `display` / `thumb` の3つを保存します。`stored_bytes` はその合計です。
- 画像はすべて `GET /api/photos/[id]/[variant]` を通して配信し、毎回権限を確認します (`Cache-Control: private, no-cache`)。共有リンク経由の元画像は、オーナーの設定で位置情報を消す (`stripGps`) ことになっていれば、表示用の画像に差し替えます。
- `taken_at` は EXIF にタイムゾーンがないため、撮影地の現地時刻を `YYYY-MM-DDTHH:mm:ss` の文字列のまま持ちます。

### Android アプリ (`android/`)

- Kotlin と Jetpack Compose のアプリです。ビルドや配布の手順は `android/README.md` にあります。この環境ではビルドできないことが多いので、確認は GitHub Actions (`.github/workflows/android.yml`) で行います。
- アプリはページの loader を使えないので、一覧は JSON API から読みます (`GET /api/albums`、`GET /api/albums/[id]`、`GET /api/settings`)。ページの loader に項目を足したら、アプリに必要かどうかも確認してください。`GET /api/info` は、アプリが接続先を登録するときに Selfy かどうかを確かめるためのものです。
- 写真の変換の規則 (大きさ、画質、撮影情報の書式) は `src/lib/upload.ts` と `android/.../transfer/PhotoRules.kt` で同じにします。

### UI

- `components/ui/` は shadcn/ui です。テーマの切り替えは next-themes、スタイルは Tailwind CSS v4 (`src/index.css`) です。
- `design/` に画面デザインの書き出しがあります。見た目を変えるときの基準で、読み方は `design/README.md` にあります。パソコン版とスマホ版は1つのレスポンシブなコンポーネントで作ります。

## 書き方

- UI の文言、エラーメッセージ、コードのコメントは日本語です。コメントには「何をしているか」ではなく「なぜそうするか」を書きます。
- コミットメッセージは `feat: ...` / `chore: ...` の形で、本文は日本語です。
