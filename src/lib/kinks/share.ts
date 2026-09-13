import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { isChoiceKey } from "./choices";
import { LEVELS, type Answers } from "./types";

/**
 * Share links carry the answers in the URL hash, so they never reach the server.
 *
 * Payload before compression: `2|<slug>|<keys for favorite>|<like>|<indifferent>|<maybe>|<dislike>`
 * where each group is a comma separated list of choice keys (`o12,i4`).
 */
const FORMAT_VERSION = "2";

export interface SharedAnswers {
  slug: string;
  answers: Answers;
}

export function encodeShare(slug: string, answers: Answers): string {
  const groups = LEVELS.map((level) =>
    Object.keys(answers)
      .filter((key) => answers[key] === level)
      .sort()
      .join(","),
  );
  return compressToEncodedURIComponent([FORMAT_VERSION, slug, ...groups].join("|"));
}

export function decodeShare(payload: string): SharedAnswers | null {
  const raw = decompressFromEncodedURIComponent(payload.trim().replace(/^#/, ""));
  if (!raw) return null;
  const [version, slug, ...groups] = raw.split("|");
  if (version !== FORMAT_VERSION || !slug || groups.length !== LEVELS.length) return null;
  const answers: Answers = {};
  groups.forEach((group, index) => {
    for (const key of group.split(",")) {
      if (isChoiceKey(key)) answers[key] = LEVELS[index];
    }
  });
  return { slug, answers };
}

export function shareUrl(origin: string, slug: string, answers: Answers) {
  return `${origin}/s#${encodeShare(slug, answers)}`;
}

/** Accepts a full share URL or just the hash payload. */
export function decodeShareInput(input: string): SharedAnswers | null {
  const trimmed = input.trim();
  const hashIndex = trimmed.indexOf("#");
  return decodeShare(hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : trimmed);
}
