import type { Locale } from "../config";
import type { Messages } from "../translator";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";

export const MESSAGES: Record<Locale, Messages> = { en, it, es, de, fr };
