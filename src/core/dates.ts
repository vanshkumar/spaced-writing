export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dt = new Date(y, m, d); // local midnight
  return isoFromDate(dt);
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m - 1), d);
  dt.setDate(dt.getDate() + days);
  return isoFromDate(dt);
}

export function isoFromDate(dt: Date): string {
  const y = dt.getFullYear();
  const m = (dt.getMonth() + 1).toString().padStart(2, "0");
  const d = dt.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

