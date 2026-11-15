<p align="center">
  <img src="docs/title.svg" alt="Selfy" width="640">
</p>

<p align="center">
  <b>A photo library for you and your people, running on Cloudflare</b>
</p>

<p align="center">
  <a href="README.md">日本語</a> | English
</p>

---

## What is Selfy?

Selfy is a self-hosted photo storage and viewer that runs on your own Cloudflare account.
It is meant for a small group, such as family or friends, who want to collect photos in one place and browse them together.

It is built with [Void](https://void.cloud), a full-stack Vite framework for Cloudflare Workers.
Photos are stored in R2 and data in D1.

## Features

- 📁 **Albums**: organize photos by album. HEIC files are converted automatically, and capture dates are read from EXIF
- 🖼️ **Lightbox**: full-size view with keyboard and swipe navigation
- ⭐ **Favorites**: see all your favorite photos in one place
- ✅ **Bulk actions**: drag to select many photos, then download (ZIP), hide or delete them
- 👥 **Members**: add people to an album as viewers or contributors
- 🔗 **Share links**: public links that need no login, with an expiry and an optional download permission
- 🔐 **Passwordless login**: passkeys, email login links and one-time codes
- 🛡️ **Invite only**: only email addresses the admin allows can sign up or log in
- 🌗 **Dark mode and mobile layouts**

## Self-hosting

These steps deploy Selfy to your own Cloudflare account.

### Requirements

- A Cloudflare account (Selfy uses D1, R2 and Workers)
- A domain managed by Cloudflare, for the app's URL
- A [Resend](https://resend.com) account with a verified sending domain
- [Bun](https://bun.sh)

### 1. Get the code

```sh
git clone https://github.com/kazeusagi/selfy.git
cd selfy
bun install
```

### 2. Log in to Cloudflare

```sh
bunx void cloudflare login
```

A browser window opens. Choose the account to deploy to.

### 3. Set the secrets

Production values are never uploaded from `.env`. Set them with `void secret put`.

```sh
bunx void secret put RESEND_API_KEY   # Your Resend API key
bunx void secret put ADMIN_EMAIL      # The admin's email address
bunx void secret put EMAIL_FROM       # The sender address, on the domain you verified with Resend
```

You don't need to set `BETTER_AUTH_SECRET`. Void creates it for you.

> [!NOTE]
> If the secrets can't be set because the Worker doesn't exist yet, run `void deploy` once first, then set them and deploy again.

### 4. Deploy

Set the domain to serve the app on with the `SELFY_DOMAIN` environment variable. Use a domain managed by Cloudflare.

```sh
SELFY_DOMAIN=photos.example.com bunx void deploy --platform cloudflare
```

Without `SELFY_DOMAIN`, the app is served on a `*.workers.dev` subdomain instead of a custom domain.

```sh
bunx void deploy --platform cloudflare
```

> [!WARNING]
> Pass `SELFY_DOMAIN` in the environment of the deploy command, not in `.env`.
> If you deploy without it after using a custom domain, the custom domain is removed and the app moves to `*.workers.dev`.

This creates D1 and R2, builds the app, applies migrations and uploads the Worker in one go.
The IDs of the created resources are recorded in `void.lock.json`. It differs per deployment, so it is listed in `.gitignore`.
Keep the file safe: if it is lost, the next deploy creates new resources.

### 5. Start using it

1. Open your domain and log in with the `ADMIN_EMAIL` address.
2. To let other people in, add their email addresses to the allowlist on the **Settings** page.
   Addresses that aren't on the list can't sign up or log in.
3. After someone logs in for the first time, they show up as a member you can add to albums.

### Deploying with GitHub Actions (optional)

`.github/workflows/void-deploy.yml` deploys on every push to `main`.
It only runs in repositories where the `SELFY_DEPLOY` variable is `true`, so a fork that hasn't been set up won't run it.

Deploy once from your machine first so that `void.lock.json` exists, then add these under Settings → Secrets and variables → Actions.

| Kind | Name | Value |
|---|---|---|
| Variables | `SELFY_DEPLOY` | `true` |
| Variables | `SELFY_DOMAIN` | The domain to serve on, or `workers.dev` if you don't use a custom domain |
| Secrets | `CLOUDFLARE_API_TOKEN` | A token with Workers Scripts edit permission and access to D1 and R2 |
| Secrets | `VOID_LOCK_JSON` | The contents of your local `void.lock.json`, as is |

> [!WARNING]
> Deploying without `void.lock.json` creates a new D1 database and R2 bucket, and your site would come up with empty data.
> The workflow therefore fails when `VOID_LOCK_JSON` is missing.
> After a change that uses a resource other than D1 or R2, deploy once from your machine and update `VOID_LOCK_JSON`.

Changes that only touch `android/` or documentation don't trigger a deploy. You can also run the workflow by hand from the Actions page.
See the [Void documentation](https://void.cloud) for details.

## Development

### Tech stack

| Area | What it uses |
|---|---|
| Framework | [Void](https://void.cloud) / Vite / React |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (Drizzle) |
| Storage | Cloudflare R2 |
| Auth | Better Auth (passkeys, magic links, email OTP) |
| Email | [Resend](https://resend.com) |
| UI | Tailwind CSS / shadcn/ui / Radix UI |

### Requirements

- [Bun](https://bun.sh)

### Steps

1. Install dependencies.

   ```sh
   bun install
   ```

2. Copy `.env.example` to `.env` and set `ADMIN_EMAIL` to your own email address.
   In development, emails go to a local inbox, so the other values can stay as they are.

   ```sh
   cp .env.example .env
   ```

3. Start the dev server. Database migrations are applied automatically on startup.

   ```sh
   bun run dev
   ```

4. Open <http://localhost:5173> and log in with the `ADMIN_EMAIL` address.
   Login emails are not actually sent. They arrive in the local inbox at
   `http://localhost:5173/__void/inbox?token=...`, which the dev server prints when it starts.

### Common commands

| Command | What it does |
|---|---|
| `bun run dev` | Start the dev server |
| `bun run build` | Build for production |
| `bunx void db generate` | Generate a migration from changes to `src/db/schema.ts` |

## License

[MIT](LICENSE)
