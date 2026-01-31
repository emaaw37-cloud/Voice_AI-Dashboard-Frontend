export function classNames(
  ...parts: Array<string | false | null | undefined>
) {
  return parts.filter(Boolean).join(" ");
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSeconds(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** PRD 3.2.1 - "3m 45s" style for Average Call Duration */
export function formatDurationShort(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  if (sec === 0) return `${m}m`;
  return `${m}m ${sec}s`;
}

export function maskKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length <= 10) return "•".repeat(Math.max(0, trimmed.length));
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

export function safeGetEnv(name: string) {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export function formatInvoiceFileName(
  counter: number,
  issuedAt: Date,
  prefix = "Sassle_Invoice"
) {
  const n = String(counter).padStart(3, "0");

  const day = issuedAt.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";

  const dayPart = `${day}${suffix}`;
  const month = issuedAt.toLocaleString("en-US", { month: "short" });
  const year = issuedAt.getFullYear();

  const datePart = `${dayPart}_${month}_${year}`;
  return `${prefix}_${n}_${datePart}.pdf`;
}
