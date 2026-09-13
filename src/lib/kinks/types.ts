export const LEVELS = ["favorite", "like", "indifferent", "maybe", "dislike"] as const;

export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  favorite: "Favorite",
  like: "Like",
  indifferent: "Indifferent",
  maybe: "Maybe",
  dislike: "Dislike",
};

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

/** Shape of the typed seed files in `src/db/seed-data`. */
export interface SeedItem {
  name: string;
  description?: string;
  options?: string[];
}

export interface SeedCategory {
  name: string;
  description?: string;
  items: SeedItem[];
}

export interface SeedList {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  categories: SeedCategory[];
}

/** Runtime shapes, loaded from the database. */
export interface KinkOption {
  id: number;
  label: string;
}

export interface KinkItem {
  id: number;
  name: string;
  description: string;
  options: KinkOption[];
}

export interface KinkCategory {
  id: number;
  name: string;
  description: string;
  items: KinkItem[];
}

export interface KinkList {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  categories: KinkCategory[];
}

export interface KinkListSummary {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  categoryCount: number;
  itemCount: number;
  choiceCount: number;
}

/** Answers keyed by choice key (see `choiceKey`). */
export type Answers = Record<string, Level>;
