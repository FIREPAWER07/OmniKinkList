# OmniKinkList (By [FIREPAWER07](https://github.com/FIREPAWER07) and [redboy4313](https://github.com/redboy4313))

[![CI](https://github.com/FIREPAWER07/OmniKinkList/actions/workflows/ci.yml/badge.svg?branch=v2)](https://github.com/FIREPAWER07/OmniKinkList/actions/workflows/ci.yml)
[![GitHub issues](https://img.shields.io/github/issues/FIREPAWER07/OmniKinkList)](https://github.com/FIREPAWER07/OmniKinkList/issues)
[![License](https://img.shields.io/github/license/FIREPAWER07/OmniKinkList)](LICENSE)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D31CKA7D)

A web app for adults to **explore, rate, and share their kinks**. Pick a list, answer each item from Hard limit to Favorite, get a clear overview, compare with a partner, and share it with a private link.

This is **v2**, a full rewrite of the original static site in Next.js. It runs at [omnikinklist.netlify.app](https://omnikinklist.netlify.app).

## Features

**Answering**

- Three lists: Common, Uncommon, and Omni, from a quick look to every option.
- Six answers, negative on the left and positive on the right: Hard limit, Dislike, Maybe, Indifferent, Like, Favorite. Click an answer again to clear it.
- Items split into **roles** (Giving, Receiving) and **variants** (Soft, Deep), so answers stay meaningful.
- Mark anything as *tried it* or *want to try*, and add private notes.
- Add your own write-in items to any list.
- Search, "only unanswered", category icons, progress per category, and a small celebration when a list is done.

**Your data**

- Private by default: answers live in your browser. No account needed.
- **Profiles**: keep several sets of answers in one browser, for example yours and a partner's.
- **Encrypted sync** (optional, with an account): see [How encrypted sync works](#how-encrypted-sync-works).
- **Share with a link**: answers are compressed into the part of the URL after `#`, which browsers never send to a server. Optionally add a name and your notes.
- **Compare** two sets of answers: matches, things to talk about, and hard conflicts, with complementary roles paired up (Giving with Receiving).
- Export a standalone HTML file or a PNG image, and import exports later. Exports from the old v1 site still import.

**The site**

- Interface and list content in English, Italian, Spanish, German, and French.
- Dark and light theme with a choice of accent colors, keyboard accessible, responsive, 18+ notice.
- Suggest a new item from the site; editors review suggestions in the editor.
- Public changelog built from published versions, plus "new" badges on items added since your last visit.
- Link previews (Open Graph images) for the home page and shared links.

**Editing** (for editors and admins)

- Web editor with drag and drop ordering, copy and move items between lists, and a translation tab per language.
- Changes are saved as a **draft**; publishing creates a numbered version with an optional note. Old versions can be restored.
- Activity log of every change, with undo.
- Editors must turn on two-factor authentication.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) with React 19 and TypeScript
- [Bun](https://bun.sh) as package manager, script runner, and unit test runner
- [Tailwind CSS v4](https://tailwindcss.com), [Phosphor Icons](https://phosphoricons.com), [dnd-kit](https://dndkit.com), [sonner](https://sonner.emilkowal.ski)
- [Drizzle ORM](https://orm.drizzle.team) on [libSQL](https://github.com/tursodatabase/libsql): a local SQLite file in development, [Turso](https://turso.tech) in production
- [Better Auth](https://www.better-auth.com): email and password with verification, Google, Proton (via SimpleLogin), two-factor authentication, rate limits, and Cloudflare Turnstile
- [Resend](https://resend.com) for email, [Playwright](https://playwright.dev) for end-to-end tests, GitHub Actions for CI

## Getting started

Requirements: Bun 1.3 or newer.

```bash
bun install
cp .env.example .env.local   # then fill in BETTER_AUTH_SECRET and ADMIN_EMAILS
bun run db:setup             # create tables in local.db and seed the three lists
bun run dev
```

Open http://localhost:3000. Without `RESEND_API_KEY`, verification and reset emails are printed in the terminal running `bun run dev`, so you can click the links from there.

### Roles

| Role | Can do |
| --- | --- |
| User | Answer lists, sync, suggest items. Everyone who signs up starts here. |
| Trusted editor | Edit every list, translate, review suggestions, publish, undo. |
| Admin | Everything above, plus create and delete lists and change user roles. |

Sign up stays open to everyone. To add an editor, they create a normal account, and an admin gives it the editor role from **Editor > Users**. Editors and admins must turn on two-factor authentication under **Account** before the editor opens.

To create the first admin, put your email in `ADMIN_EMAILS` before you sign up, or sign up first and run `bun run user:role you@example.com admin`.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` / `bun run start` | Production build and server |
| `bun run test` | Unit tests (choices, share links, import and export, compare, versions, translations) |
| `bun run test:e2e` | Playwright end-to-end tests against a production build with its own `e2e.db` |
| `bun run lint` / `bun run typecheck` | ESLint and TypeScript checks |
| `bun run db:generate` | Create a new SQL migration after changing `src/db/schema.ts` |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed and publish lists if the database has none (`--force` wipes list content and reseeds) |
| `bun run db:setup` | Migrate and seed |
| `bun run db:export-seed` | Write the published lists and translations back into `src/db/seed-data` (`--draft` for drafts) |
| `bun run db:studio` | Browse the database in Drizzle Studio |
| `bun run user:role <email> <user\|trusted\|admin>` | Change a user's role from the terminal |

For end-to-end tests, run `bunx playwright install chromium` once, or use a browser you already have with `PW_CHANNEL=msedge` or `PW_CHANNEL=chrome`.

## Deploying to Netlify

1. Create a [Turso](https://turso.tech) database and copy its URL (`libsql://...`) and an auth token.
2. In Netlify, import the repository. [`netlify.toml`](netlify.toml) holds the build settings (Bun, Node 22).
3. Under **Site configuration > Environment variables**, set at least:
   - `DATABASE_URL` and `DATABASE_AUTH_TOKEN`
   - `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `BETTER_AUTH_URL`, for example `https://omnikinklist.netlify.app`
   - `ADMIN_EMAILS`
   - `RESEND_API_KEY` and `EMAIL_FROM`, otherwise nobody can verify their email
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (recommended)
   - Optional: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and `SIMPLELOGIN_CLIENT_ID`/`SIMPLELOGIN_CLIENT_SECRET`
4. Deploy. Production deploys run migrations and seed the lists if the database is empty, then build.

Every variable is described in [`.env.example`](.env.example).

### Setting up the services

- **Google**: in Google Cloud Console, create an OAuth client (Web application) with the redirect URL `https://<your-domain>/api/auth/callback/google`.
- **Proton**: Proton has no public sign-in API, but SimpleLogin (owned by Proton) does, and people can sign in with their Proton account there. Create an app at [app.simplelogin.io/developer](https://app.simplelogin.io/developer) with the redirect URL `https://<your-domain>/api/auth/callback/simplelogin`.
- **Resend**: add and verify your sending domain, create an API key, and set `EMAIL_FROM` to an address on that domain.
- **Turnstile**: in the Cloudflare dashboard, add a widget for your domain (and `localhost` if you want it in development).

Notes:

- Deploy previews and branch deploys only build, so a pull request never changes the production database schema. To give previews their own data, set a different `DATABASE_URL` for the *Deploy Previews* context.
- Email and password sign in works on deploy previews too: `*--<site-name>.netlify.app` is allowed automatically. Google and SimpleLogin only redirect to the URLs you registered.

## How the data works

- **Drafts and versions.** Editors change the working copy of each list. Visitors only see published versions, stored as snapshots in `list_versions`. Publishing compares the draft with the last version to build the changelog and the "new" badges.
- **Translations** are stored per language and field. Anything not translated falls back to English.
- **Choice keys.** Every answerable thing has a stable key: `i<id>` for an item without options, `o<id>` for a role or variant, `c<id>` for a write-in item. Answers, share links, and exports use these keys, and exports also store names so imports still work if ids change.
- **Seed files.** The starting content is typed TypeScript in [`src/db/seed-data`](src/db/seed-data). See [docs/EDITING-LISTS.md](docs/EDITING-LISTS.md).

## How encrypted sync works

Sync is optional and needs an account. It is end-to-end encrypted, which means the server stores your answers but cannot read them.

1. When you turn sync on, you choose a **sync passphrase**. It is separate from your account password and never leaves your browser.
2. Your browser turns the passphrase into an encryption key (PBKDF2 with 600,000 rounds and a random salt).
3. All profiles, answers, notes, and write-ins are compressed and encrypted with that key (AES-GCM) before upload. The server receives only unreadable bytes.
4. On another device you sign in and type the same passphrase. The browser downloads the encrypted data, decrypts it locally, and merges it with anything already there, keeping the most recent change per list.
5. After that, changes sync automatically. The key stays stored in that browser (it cannot be exported) until you sign out or choose "forget this device".

Because only you know the passphrase, **nobody can recover your synced data if you forget it**, not even an admin. The answers on your devices are not affected; you can turn sync off and start again with a new passphrase.

## Project structure

```
src/
  app/[locale]/        routes (home, list, results, share, compare, import, suggest, changelog, auth, account, admin)
  components/
    kinks/             rater, item cards, rating page, results, share, image, import, compare
    account/           profile, password, two-factor, sync
    admin/             list editor, translations, versions, suggestions, users, activity
    ui/                buttons, fields, dialog, menu
  db/                  Drizzle schema, client, migrations, seed data, publishing
  i18n/                locales, translator, message dictionaries
  lib/
    kinks/             types, choices, local store, share links, export, import, compare, image
    sync/              encryption and the sync provider
    admin/             validation, queries, actions, undo snapshots
    auth.ts            Better Auth server config
drizzle/               SQL migrations
e2e/                   Playwright tests
```

## Links

- [Report issues](https://github.com/FIREPAWER07/OmniKinkList/issues)
- [Support on Ko-fi](https://ko-fi.com/D1D31CKA7D)

## Other projects

### Spicetify Installer

A clean and simple installer for Spicetify, making it easier than ever to customize your Spotify experience. [Check it out here](https://github.com/FIREPAWER07/SpicetifyInstaller).

### SendDisImages

A modern, lightweight desktop app that lets you easily send one or multiple high-quality images to Discord channels through your bot, with smart compression, Nitro mode support, and a clean, responsive UI. [Check it out here](https://github.com/FIREPAWER07/SendDisImages).

## License

[GPL-3.0](LICENSE)
