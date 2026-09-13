export const ACCENTS = ["pink", "violet", "blue", "teal", "orange"] as const;
export type Accent = (typeof ACCENTS)[number];
export const ACCENT_KEY = "okl:accent";

/** Inline script that applies the saved accent before the first paint. */
export const ACCENT_SCRIPT = `try{var a=localStorage.getItem("${ACCENT_KEY}");if(a&&a!=="pink")document.documentElement.setAttribute("data-accent",a)}catch(e){}`;
