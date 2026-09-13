import { z } from "zod";
import { ROLES } from "@/db/schema";

const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);
const required = (max: number) => text(max).min(1, "This field is required.");

export const listInput = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,31}$/, "Use 2 to 32 lowercase letters, numbers, or dashes."),
  name: required(40),
  tagline: text(60),
  description: text(300),
});

export const categoryInput = z.object({
  id: z.number().int().positive().optional(),
  listSlug: z.string().trim().min(1),
  name: required(60),
  description: text(300),
});

export const itemInput = z
  .object({
    id: z.number().int().positive().optional(),
    categoryId: z.number().int().positive(),
    name: required(80),
    description: text(300),
    options: z
      .array(z.object({ id: z.number().int().positive().optional(), label: required(50) }))
      .max(24, "Use at most 24 options."),
  })
  .refine(
    (item) => new Set(item.options.map((o) => o.label.toLowerCase())).size === item.options.length,
    { message: "Option names must be unique.", path: ["options"] },
  );

export const roleInput = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES),
});

export type ListInput = z.infer<typeof listInput>;
export type CategoryInput = z.infer<typeof categoryInput>;
export type ItemInput = z.infer<typeof itemInput>;

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input.";
}
