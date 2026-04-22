// Helpers for editorial post timing & derived status.
// A post stored as "approved" (= scheduled) flips visually to "published"
// once its scheduled date+time has passed.

export type RawPostStatus = "pending" | "approved" | "published";
export type DisplayPostStatus = RawPostStatus;

export function buildScheduledAt(date: string, time: string | null | undefined): Date {
  // date is YYYY-MM-DD (local), time is HH:MM or HH:MM:SS
  const [y, m, d] = date.split("-").map(Number);
  const t = (time ?? "09:00:00").padEnd(8, ":00").slice(0, 8);
  const [hh, mm, ss] = t.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, ss ?? 0);
}

/**
 * Returns the status to *display* to the user.
 * - "published" stays "published".
 * - "approved" auto-becomes "published" once scheduled_at <= now.
 * - "pending" never auto-flips (still waiting on client approval).
 */
export function getDisplayStatus(
  status: RawPostStatus,
  scheduledDate: string,
  scheduledTime: string | null | undefined,
  now: Date = new Date(),
): DisplayPostStatus {
  if (status === "published") return "published";
  if (status === "approved") {
    const at = buildScheduledAt(scheduledDate, scheduledTime);
    if (at.getTime() <= now.getTime()) return "published";
  }
  return status;
}

export function formatTimeBR(time: string | null | undefined): string {
  if (!time) return "09:00";
  return time.slice(0, 5);
}
