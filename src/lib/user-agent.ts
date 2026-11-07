const BROWSERS = [
  ["Edg/", "Edge"],
  ["Firefox/", "Firefox"],
  ["Chrome/", "Chrome"],
  ["Safari/", "Safari"],
] as const;

const SYSTEMS = [
  ["iPhone", "iPhone"],
  ["iPad", "iPad"],
  ["Android", "Android"],
  ["Windows", "Windows"],
  ["Mac OS", "Mac"],
  ["Linux", "Linux"],
] as const;

export function describeUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "不明な端末";
  const browser = BROWSERS.find(([token]) => userAgent.includes(token))?.[1];
  const system = SYSTEMS.find(([token]) => userAgent.includes(token))?.[1];
  return [browser, system].filter(Boolean).join(" · ") || "不明な端末";
}
