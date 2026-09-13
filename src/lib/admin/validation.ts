import { z } from "zod";
import { CATEGORY_ICON_KEYS } from "@/lib/category-icon-keys";
import { TRANSLATION_LOCALES } from "@/i18n/config";
import { OPTION_KINDS } from "@/lib/kinks/types";
import { ROLES } from "@/lib/roles";

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);
const required = (max: number) => text(max).min(1, "This field is required.");

export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{1,31}$/, "Use 2 to 32 lowercase letters, numbers, or dashes.");

export const listInput = z.object({
  slug: slugSchema,
  name: required(40),
  tagline: text(60),
  description: text(300),
});

export const categoryInput = z.object({
  id: z.number().int().positive().optional(),
  listSlug: slugSchema,
  name: required(60),
  description: text(300),
  icon: z.enum(CATEGORY_ICON_KEYS as [string, ...string[]]),
});

export const itemInput = z
  .object({
    id: z.number().int().positive().optional(),
    categoryId: z.number().int().positive(),
    name: required(80),
    description: text(300),
    options: z
      .array(z.object({ id: z.number().int().positive().optional(), label: required(50), kind: z.enum(OPTION_KINDS) }))
      .max(24, "Use at most 24 options."),
  })
  .refine((item) => new Set(item.options.map((o) => o.label.toLowerCase())).size === item.options.length, {
    message: "Option names must be unique.",
    path: ["options"],
  });

export const translationInput = z.object({
  listSlug: slugSchema,
  locale: z.enum(TRANSLATION_LOCALES as [string, ...string[]]),
  entityKey: z.string().regex(/^(?:l:[a-z0-9-]+|[cio]:\d+)$/),
  field: z.enum(["name", "tagline", "description", "label"]),
  value: text(300),
});

export const roleInput = z.object({ userId: z.string().min(1), role: z.enum(ROLES) });

export const reorderInput = z.array(z.number().int().positive()).max(500);

export type ListInput = z.infer<typeof listInput>;
export type CategoryInput = z.infer<typeof categoryInput>;
export type ItemInput = z.infer<typeof itemInput>;
export type TranslationInput = z.infer<typeof translationInput>;

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
