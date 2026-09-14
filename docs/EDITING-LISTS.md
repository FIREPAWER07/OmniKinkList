# Editing the kink lists

There are two ways to change what is on the lists: the web editor (for the live site) and the seed files (for a fresh database).

## Getting access

1. Create a normal account on the site (email and password, Google, or Proton).
2. Ask an admin to give your account the **Trusted editor** role. Admins do this under **Editor > Users**.
3. Turn on two-factor authentication under **Account**. The editor does not open until you do.
4. Open **Editor** from the account menu, or go to `/admin`.

The editor is in English. Visitors see each list in their own language when a translation exists.

## 1. The web editor

### Drafts and publishing

Everything you change is saved to a **draft** right away, but visitors keep seeing the last published version until someone publishes.

- A bar at the top of each list shows how many changes are unpublished and what they are.
- **Publish** creates a new numbered version. Add a short note if it helps; the changes show up in the public changelog, and newly added items and options get a "new" badge for people who already visited that list.
- **Discard changes** throws the draft away and goes back to the live version.
- **Versions** lists every published version. Restoring one copies it into the draft, so you can review it and publish again.

### Content

- Drag categories and items by their handle to reorder them.
- Every item has a name, an optional description, and optional **options**. Each option is either a:
  - **Role**: who does what, like *Giving* and *Receiving*. The compare page pairs complementary roles, so Giving on one side matches Receiving on the other.
  - **Variant**: a kind or intensity of the same thing, like *Soft* and *Deep*.
  - Leave options empty for a single answer.
- Pick a different category in the item dialog to move an item, including into another list. **Copy this item to** makes a copy in another category and keeps the original.
- Renaming an option keeps people's answers. **Deleting** an option or item removes those answers from results, and share links made before skip them.
- Option names must be unique within an item.
- Categories have an icon, chosen in the category dialog.

### Translations

Open a list and pick a language from the tabs next to **Content (English)**. Each row shows the English text on the left and the translation on the right.

- Translations save automatically a moment after you stop typing, and when you leave the field.
- **Only missing** hides rows that are already translated.
- Anything left empty falls back to English.
- Translations are part of the draft too, so publish when you are done.

### Suggestions

Visitors can suggest new items from `/suggest`. Pending suggestions show up under **Suggestions** with a count in the editor menu.

- **Accept** opens the item dialog prefilled with the suggestion. Adjust it, pick a category, and save. The item lands in the draft.
- **Reject** closes the suggestion without adding anything.

### Activity and undo

Every change is recorded under **Activity** with who made it and when. Most entries have an **Undo** button that puts things back exactly as they were before that change, including deleted items and categories. Undo is itself recorded, and the result still has to be published.

## 2. The seed files

The starting content is typed TypeScript in [`src/db/seed-data`](../src/db/seed-data), one file per list. These files only fill an **empty** database, so editing them does not change a site that is already running. Use the web editor for that.

```ts
{
  name: "Sex",
  icon: "fire",
  description: "The core acts most people have an opinion on.",
  items: [
    { name: "Oral sex", description: "Using the mouth on a partner's genitals.", roles: ["Giving", "Receiving"] },
    { name: "Anal play", description: "Stimulation of the anus, from light touch to penetration.", roles: ["Giving", "Receiving"] },
    { name: "Masturbation", description: "Pleasuring yourself, alone or with a partner watching." },
  ],
},
```

- `roles` and `variants` are optional. Without either, the item gets a single answer.
- `icon` is one of the names in [`src/lib/category-icon-keys.ts`](../src/lib/category-icon-keys.ts).
- To add a new list, create a file exporting a `SeedList` and add it to [`src/db/seed-data/index.ts`](../src/db/seed-data/index.ts).
- Run `bun run test` to check for duplicate names and other mistakes.
- Run `bun run db:seed --force` to wipe the list content, versions, and translations in your **local** database and reseed. Accounts are kept.

### Keeping the seed files in sync with the site

Run `bun run db:export-seed` against a database (for example with the production `DATABASE_URL` set) to write its published lists and translations back into `src/db/seed-data`. Use `--draft` to export the drafts instead.

Exported files include `id` and `optionIds`, so a database seeded from them keeps the same choice keys, and every existing share link and export stays valid. Hand-written files without ids get ids assigned in order.

Translations live in [`translations.ts`](../src/db/seed-data/translations.ts) as `{ locale, entityKey, field, value }`, where the entity key is `l:<slug>`, `c:<id>`, `i:<id>`, or `o:<id>`.
