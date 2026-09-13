/** Display order, from strongest no (left) to strongest yes (right). */
export const LEVELS = ["limit", "dislike", "maybe", "indifferent", "like", "favorite"] as const;

export type Level = (typeof LEVELS)[number];

export const POSITIVE_LEVELS: readonly Level[] = ["like", "favorite"];
export const NEGATIVE_LEVELS: readonly Level[] = ["dislike", "limit"];

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

/** Optional second answer per choice. */
export const EXPERIENCES = ["tried", "want"] as const;
export type Experience = (typeof EXPERIENCES)[number];

export function isExperience(value: unknown): value is Experience {
  return value === "tried" || value === "want";
}

/**
 * Roles are the parts people can take (Giving, Receiving, Dominant).
 * Variants are kinds, materials, or intensities (Metal, Light, Public).
 */
export const OPTION_KINDS = ["role", "variant"] as const;
export type OptionKind = (typeof OPTION_KINDS)[number];

/* ------------------------------------------------------------------ */
/* Seed files (src/db/seed-data)                                       */
/* ------------------------------------------------------------------ */

export interface SeedItem {
  id?: number;
  name: string;
  description?: string;
  roles?: string[];
  variants?: string[];
  /** Keeps option ids stable when the seed was exported from a database. */
  optionIds?: number[];
}

export interface SeedCategory {
  id?: number;
  name: string;
  icon?: string;
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

/* ------------------------------------------------------------------ */
/* Runtime shapes                                                      */
/* ------------------------------------------------------------------ */

export interface KinkOption {
  id: number;
  label: string;
  kind: OptionKind;
  /** ISO date of the first published version that contained this option. */
  addedAt?: string;
}

export interface KinkItem {
  id: number;
  name: string;
  description: string;
  options: KinkOption[];
  addedAt?: string;
  /** Written in by the person answering; keys use `c` instead of `i`/`o`. */
  custom?: boolean;
}

export interface KinkCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  items: KinkItem[];
}

export interface KinkList {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  categories: KinkCategory[];
  version?: number;
  publishedAt?: string;
}

export interface KinkListSummary {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  categoryCount: number;
  itemCount: number;
  choiceCount: number;
  /** Item and option `addedAt` dates, for "new since your last visit". */
  addedDates: string[];
}

/** Answers keyed by choice key (see `choices.ts`). */
export type Answers = Record<string, Level>;
export type ExperienceMap = Record<string, Experience>;
/** Notes keyed by item key (`i12` or `c3`). */
export type Notes = Record<string, string>;

/** An item a person added for themselves. Lives only in their data. */
export interface CustomItem {
  /** Positive integer, unique within the list data. */
  id: number;
  name: string;
  description: string;
  /** Option ids are unique within the item. */
  options: KinkOption[];
}

/** Everything one profile stored for one list. */
export interface ListData {
  answers: Answers;
  experience: ExperienceMap;
  notes: Notes;
  custom: CustomItem[];
  /** Epoch ms of the previous visit to the list page. */
  lastVisitAt?: number;
  updatedAt: number;
}
