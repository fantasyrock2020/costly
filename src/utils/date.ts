/**
 * Returns today's date in YYYY-MM-DD format (local timezone).
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the current time in HH:MM format.
 */
export function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats an ISO date (YYYY-MM-DD) to Vietnamese format (DD/MM/YYYY).
 */
export function formatToVietnameseDate(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formats an ISO date into group headers: "Hôm nay", "Hôm qua" or "DD/MM/YYYY".
 */
export function formatGroupDate(isoDate: string): string {
  const today = getTodayISO();
  
  // Calculate yesterday's date
  const todayDate = new Date(today);
  todayDate.setDate(todayDate.getDate() - 1);
  const yesterday = todayDate.toISOString().split("T")[0];

  if (isoDate === today) {
    return "Hôm nay";
  } else if (isoDate === yesterday) {
    return "Hôm qua";
  } else {
    return formatToVietnameseDate(isoDate);
  }
}

/**
 * Formats a month and year into Vietnamese standard string (e.g. "Tháng 8, 2026").
 * @param year - 4 digit year
 * @param month - 1-indexed month (1 to 12)
 */
export function formatMonthYear(year: number, month: number): string {
  return `Tháng ${month}, ${year}`;
}

/**
 * Generates an array of all date strings (YYYY-MM-DD) for a given month and year.
 */
export function getDaysInMonth(year: number, month: number): string[] {
  const date = new Date(year, month - 1, 1);
  const days: string[] = [];
  while (date.getMonth() === month - 1) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    days.push(`${y}-${m}-${d}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
}

/**
 * Parses date components from YYYY-MM-DD.
 */
export function parseISODate(isoDate: string) {
  const parts = isoDate.split("-");
  if (parts.length !== 3) {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
  }
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10),
  };
}

/**
 * Gets the relative comparison month.
 * If current is (2026, 8), previous is (2026, 7).
 * If current is (2026, 1), previous is (2025, 12).
 */
export function getPreviousMonth(year: number, month: number) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}
