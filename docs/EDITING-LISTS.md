# Editing the kink lists

There are two ways to change what is on the lists.

## 1. On the website (recommended)

Anyone with a **trusted editor** or **admin** account can edit the live lists.

1. Sign in from **Editor sign in** in the footer.
2. Open **Edit content** from the account menu, or go to `/admin`.
3. Pick a list and use the buttons next to each category or item to edit, reorder, add, or delete.

Things to know:

- Changes are live for everyone as soon as you save.
- Every change is recorded under **Activity** with your name.
- **Options** are the roles or variants people answer separately, like *Giving* and *Receiving*. Leave them empty for a single answer.
- Renaming an option keeps people's answers. **Deleting** an option or item removes those answers from results, and old share links will skip them.
- Option names must be unique within an item (max 24 options, 50 characters each).

If you do not have access, ask an admin to trust your account after you sign up.

## 2. In the seed files (for a fresh database)

The starting content is typed TypeScript in [`src/db/seed-data`](../src/db/seed-data), one file per list. These files are only used to fill an **empty** database, so editing them does not change a site that is already running. Use the web editor for that.

```ts
{
  name: "General",
  description: "Basic kinks and fetishes that are commonly explored.",
  items: [
    { name: "Kissing", description: "Various forms of lip and mouth contact.", options: ["Giving", "Receiving"] },
    { name: "Masturbation", description: "The act of stimulating oneself sexually." },
  ],
},
```

- `options` is optional. Without it the item gets a single answer.
- To add a new list, create a file exporting a `SeedList` and add it to `src/db/seed-data/index.ts`.
- Run `bun run test` to check for duplicate category names or option labels.
- Run `bun run db:seed --force` to wipe the list content in your **local** database and reseed. Accounts are kept.

Seeding assigns ids in order, so a fresh seed always produces the same choice keys.
