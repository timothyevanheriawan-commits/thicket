import type { Category } from "@/lib/hooks/useEntries";

export const CATEGORIES: Category[] = [
  "Food",
  "Shopping",
  "Transport",
  "Savings",
  "Entertainment",
  "Bills",
];

// Curated earth-tone palette, deliberately small so an unlimited number of
// custom categories still reads as calm rather than a rainbow. Colors
// repeat once a project has more categories than swatches — identity is
// still carried by the label text everywhere color appears, so a repeat
// isn't ambiguous.
const CATEGORY_COLOR_PALETTE = [
  "#8a9a7e", // sage
  "#c99c7c", // clay
  "#6f8a5e", // moss
  "#b98079", // rose clay
  "#7d8f92", // slate
  "#b8934a", // ochre
  "#8a7292", // plum
  "#a67c52", // umber
] as const;

// Small stable string hash (djb2-ish). Deterministic across sessions and
// devices for the same input — no randomness, no stored state needed.
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0; // force 32-bit int, keeps hash bounded
  }
  return Math.abs(hash);
}

// Built-ins get explicit, guaranteed-distinct colors — these six are always
// present, so leaving them to the hash risked exactly the kind of collision
// it produced (Shopping and Entertainment both landing on sage).
const BUILT_IN_CATEGORY_COLORS: Record<string, string> = {
  Food: "#c99c7c", // clay
  Shopping: "#8a7292", // plum
  Transport: "#7d8f92", // slate
  Savings: "#6f8a5e", // moss
  Entertainment: "#b98079", // rose clay
  Bills: "#b8934a", // ochre
};

/**
 * Deterministic color for a category, hashed by name rather than id.
 * Categories currently have no rename affordance (see useCategories.ts),
 * so name is a stable key in practice — this avoids needing a `color`
 * column or any Supabase migration at all.
 *
 * Built-ins are looked up explicitly (guaranteed distinct); only custom
 * categories fall through to the hash, where collisions are possible once
 * there are more custom categories than palette swatches — an accepted
 * tradeoff since custom categories are unbounded.
 */
export function getCategoryColor(category: string | undefined): string {
  if (!category) return CATEGORY_COLOR_PALETTE[0];
  if (category in BUILT_IN_CATEGORY_COLORS) {
    return BUILT_IN_CATEGORY_COLORS[category];
  }
  const index = hashString(category) % CATEGORY_COLOR_PALETTE.length;
  return CATEGORY_COLOR_PALETTE[index];
}
