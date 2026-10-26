const PACIFIC_TZ = "Pacific/Fiji";

export function formatDate(d: Date | string | null): string {
  if (!d) return "Date unknown";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: PACIFIC_TZ }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null): string {
  if (!d) return "Date unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: PACIFIC_TZ, timeZoneName: "short",
  }).format(new Date(d));
}

export function timeAgo(d: Date | string | null, now = new Date()): string {
  if (!d) return "never";
  const mins = Math.round((now.getTime() - new Date(d).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}
