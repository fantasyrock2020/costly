/**
 * Formats a numeric value into Vietnamese Dong currency format (e.g., 1.500.000 ₫).
 * @param amount - The number to format
 * @param currencySymbol - The symbol to append, default is '₫'
 */
export function formatCurrency(amount: number, currencySymbol: string = "₫"): string {
  // Use vi-VN locale for dot-separated thousands formatting
  const formatted = new Intl.NumberFormat("vi-VN").format(amount);
  return `${formatted} ${currencySymbol}`;
}

/**
 * Parses shorthand financial expressions like "500k" or "1.5m" into full numbers.
 * Supports:
 * - "k" / "K" (thousand, e.g., 500k -> 500,000)
 * - "m" / "M" (million, e.g., 1.5m -> 1,500,000)
 * Handles both dot and comma decimal separators.
 * 
 * @param text - The raw text input to parse
 */
export function parseAmountShortcut(text: string): number {
  if (!text) return 0;
  
  // Clean raw string - remove spaces and currency symbols
  let cleaned = text.trim().toLowerCase().replace(/₫/g, "").replace(/\s/g, "");
  
  if (cleaned.length === 0) return 0;

  // Check multiplier at the end
  const lastChar = cleaned[cleaned.length - 1];
  let multiplier = 1;

  if (lastChar === "k") {
    multiplier = 1000;
    cleaned = cleaned.slice(0, -1);
  } else if (lastChar === "m") {
    multiplier = 1000000;
    cleaned = cleaned.slice(0, -1);
  }

  // Replace comma with dot for standard float parsing (e.g., 1,5m -> 1.5m)
  cleaned = cleaned.replace(/,/g, ".");
  
  const parsedValue = parseFloat(cleaned);
  if (isNaN(parsedValue)) return 0;

  return Math.round(parsedValue * multiplier);
}

/**
 * Validates if the text is a valid numeric string, potentially ending with a shortcut character.
 */
export function isValidAmountString(text: string): boolean {
  if (!text) return false;
  let cleaned = text.trim().toLowerCase().replace(/₫/g, "").replace(/\s/g, "");
  if (cleaned.length === 0) return false;

  const lastChar = cleaned[cleaned.length - 1];
  if (lastChar === "k" || lastChar === "m") {
    cleaned = cleaned.slice(0, -1);
  }
  
  cleaned = cleaned.replace(/,/g, ".");
  const parsedValue = parseFloat(cleaned);
  
  return !isNaN(parsedValue) && isFinite(parsedValue) && parsedValue >= 0;
}

/**
 * Generates dynamic amount suggestions based on partial user input.
 * Returns a compact list of 4 clean items.
 * E.g.: "1" -> ["1k", "10k", "100k", "1m"]
 * E.g.: "10" -> ["10k", "100k", "1m", "10m"]
 * E.g.: "2.5" -> ["2.5k", "25k", "250k", "2.5m"]
 */
export function getAmountSuggestions(text: string): string[] {
  const defaultPresets = ["50k", "100k", "200k", "500k"];

  if (!text || !text.trim()) {
    return defaultPresets;
  }

  const cleaned = text.trim().toLowerCase().replace(/₫/g, "").replace(/\s/g, "").replace(/,/g, ".");
  
  // If user already typed unit suffix
  if (cleaned.endsWith("k") || cleaned.endsWith("m")) {
    return [cleaned];
  }

  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) {
    return defaultPresets;
  }

  const rawStr = cleaned;
  const rawSuggestions: string[] = [];

  // 1. raw + "k" (e.g. 1 -> 1k)
  rawSuggestions.push(`${rawStr}k`);

  // 2. Multipliers with k
  if (!rawStr.includes(".")) {
    rawSuggestions.push(`${rawStr}0k`);
    rawSuggestions.push(`${rawStr}00k`);
  } else {
    rawSuggestions.push(`${num * 10}k`);
    rawSuggestions.push(`${num * 100}k`);
  }

  // 3. raw + "m" (e.g. 1 -> 1m)
  rawSuggestions.push(`${rawStr}m`);

  // 4. Multipliers with m
  if (!rawStr.includes(".")) {
    rawSuggestions.push(`${rawStr}0m`);
    rawSuggestions.push(`${rawStr}00m`);
  } else {
    rawSuggestions.push(`${num * 10}m`);
    rawSuggestions.push(`${num * 100}m`);
  }

  const seen = new Set<number>();
  const result: string[] = [];

  for (const s of rawSuggestions) {
    const parsed = parseAmountShortcut(s);
    if (parsed > 0 && parsed <= 1_000_000_000 && !seen.has(parsed)) {
      seen.add(parsed);
      // Clean up 1000k to 1m
      if (s.endsWith("k") && parsed >= 1_000_000 && parsed % 1_000_000 === 0) {
        result.push(`${parsed / 1_000_000}m`);
      } else {
        result.push(s);
      }
    }
  }

  return result.length > 0 ? result.slice(0, 4) : defaultPresets;
}
