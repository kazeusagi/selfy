const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// takenAt は現地時刻の文字列なので、Date を介さずに切り出す
function parts(takenAt: string) {
  const [, year, month, day, hour, minute] =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(takenAt) ?? [];
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    time: `${Number(hour)}:${minute}`,
  };
}

export function formatMonth(takenAt: string) {
  const { year, month } = parts(takenAt);
  return `${year}年${month}月`;
}

export function formatDayHeading(day: string) {
  const { year, month, day: date } = parts(`${day}T00:00`);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
  return `${month}月${date}日（${weekday}）`;
}

export function formatDateTime(takenAt: string) {
  const { year, month, day, time } = parts(takenAt);
  return `${year}年${month}月${day}日 ${time}`;
}

export function formatShortDateTime(takenAt: string) {
  const { month, day, time } = parts(takenAt);
  return `${month}月${day}日 ${time}`;
}

export function formatDateRange(from: string, to: string) {
  const a = parts(from);
  const b = parts(to);
  const start = `${a.year}年${a.month}月${a.day}日`;
  if (from.slice(0, 10) === to.slice(0, 10)) return start;
  if (a.year !== b.year) return `${start}〜${b.year}年${b.month}月${b.day}日`;
  if (a.month !== b.month) return `${start}〜${b.month}月${b.day}日`;
  return `${start}〜${b.day}日`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function formatCount(count: number) {
  return count.toLocaleString("ja-JP");
}

export function formatExpiry(expiresAt: number) {
  const date = new Date(expiresAt);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
