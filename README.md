# OmniKinkList (By [FIREPAWER07](https://github.com/FIREPAWER07) and [redboy4313](https://github.com/redboy4313))

[![GitHub issues](https://img.shields.io/github/issues/FIREPAWER07/OmniKinkList)](https://github.com/FIREPAWER07/OmniKinkList/issues)
[![License](https://img.shields.io/github/license/FIREPAWER07/OmniKinkList)](LICENSE)
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D31CKA7D)

A web app for adults to **explore, rate, and share their kinks**. Pick a list, answer each item from Favorite to Dislike, get a clear overview, and share it with a private link.

This is **v2**, a full rewrite of the original static site in Next.js.

## Features

- **Three lists**: Common, Uncommon, and Omni, from a quick look to every option.
- **Five answers per choice**: Favorite, Like, Indifferent, Maybe, Dislike. Click again to clear.
- **Private by default**: answers live in your browser (localStorage). Nothing is sent to the server.
- **Share with a link**: answers are compressed into the part of the URL after `#`, which browsers never send to the server.
- **Export and import**: download a standalone HTML file and import it later. Exports from the old v1 site and old v1 saved JSON can be imported too.
- **Results overview**: distribution per level, filter by level, breakdown per category.
- **Web editor for trusted users**: sign in, and if an admin has trusted your account you can add, edit, reorder, and delete lists, categories, items, and options directly on the site. Every change is recorded in an activity log.
- Dark and light theme, keyboard accessible raters, responsive layout, 18+ notice.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) with React 19 and TypeScript
- [Bun](https://bun.sh) as package manager, script runner, and test runner
- [Tailwind CSS v4](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) on [libSQL](https://github.com/tursodatabase/libsql): a local SQLite file in development, [Turso](https://turso.tech) in production
- [Better Auth](https://www.better-auth.com) for accounts (email and password, optional Discord and GitHub sign in)
- [Phosphor Icons](https://phosphoricons.com), [sonner](https://sonner.emilkowal.ski) toasts, [lz-string](https://github.com/pieroxy/lz-string) for share links

## Getting started

Requirements: Bun 1.3 or newer.

```bash
bun install
cp .env.example .env.local   # then fill in BETTER_AUTH_SECRET and ADMIN_EMAILS
bun run db:setup             # create tables in local.db and seed the three lists
bun run dev
```

Open http://localhost:3000.

### Becoming an admin

1. Put your email in `ADMIN_EMAILS` before you sign up, **or** sign up first and run `bun run user:role you@example.com admin`.
2. Go to `/signup` (linked as "Editor sign in" in the footer) and create your account.
3. Open `/admin`. As an admin you can trust other users from the **Users** tab.

### Roles

| Role | Can do |
| --- | --- |
| User | Nothing extra. Signing up alone gives no edit rights. |
| Trusted editor | Edit every list: categories, items, options, order, list details. |
| Admin | Everything above, plus create and delete lists and change user roles. |

Set `DISABLE_SIGNUP=true` once your editors have accounts if you do not want new sign ups.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run test` | Unit tests (share links, import and export, stats, seed data) |
| `bun run lint` / `bun run typecheck` | ESLint and TypeScript checks |
| `bun run db:generate` | Create a new SQL migration after changing `src/db/schema.ts` |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed lists if the database has none (`--force` wipes list content and reseeds) |
| `bun run db:setup` | Migrate and seed |
| `bun run db:studio` | Browse the database in Drizzle Studio |
| `bun run user:role <email> <user\|trusted\|admin>` | Change a user's role from the terminal |

## Deploying to Vercel

1. Create a Turso database (Vercel Marketplace or turso.tech) and copy its URL and token.
2. Import the repository in Vercel. Bun is detected from `bun.lock`.
3. Set environment variables: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your production URL), `ADMIN_EMAILS`, and optionally the Discord or GitHub OAuth keys.
4. Deploy. The `vercel-build` script applies migrations, seeds the lists if the database is empty, then builds.

For OAuth, use `https://<your-domain>/api/auth/callback/discord` (or `/github`) as the redirect URL.

## How the data works

- Lists, categories, items, and options are stored in the database and edited from `/admin`. Public pages are cached and refreshed the moment an editor saves.
- The initial content lives in typed TypeScript files in [`src/db/seed-data`](src/db/seed-data). See [docs/EDITING-LISTS.md](docs/EDITING-LISTS.md).
- Every answerable thing is a *choice* with a stable key: `o<id>` for an option, `i<id>` for an item without options. Answers, share links, and exports all use these keys, and exports also store names so imports still work if ids change.

## Project structure

```
src/
  app/                 routes (home, list, results, share, import, auth, admin)
  components/
    kinks/             rater, item cards, rating page, results, share, import
    admin/             list editor, dialogs, users, activity
    ui/                buttons, fields, dialog
  db/                  Drizzle schema, client, migrations runner, seed data
  lib/
    kinks/             types, choices, answer store, share links, export, import
    admin/             validation and queries for the editor
    auth.ts            Better Auth server config
drizzle/               SQL migrations
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
