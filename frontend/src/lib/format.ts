/** Small shared formatting helpers (relative time, percentages, ids). */

let uidCounter = 0
// MongoDB stores UTC; older API documents omit the ISO timezone suffix.
function utcDate(value: string): number {
  return new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`).getTime()
}
export function uid(): string {
  uidCounter += 1
  return `ui_${Date.now().toString(36)}_${uidCounter}`
}

function fmtQuantity(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  if (hours < 24) return `${Math.round(hours)}h`
  const days = hours / 24
  return `${Math.round(days * 10) / 10}d`
}

/** "just now" / "3m ago" / "2d ago" */
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const then = utcDate(dateStr)
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  if (diff < 60_000) return 'just now'
  return `${fmtQuantity(diff)} ago`
}

/** "in 3d 2h" or "expired" for a future deadline. */
export function timeUntil(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const then = utcDate(dateStr)
  if (Number.isNaN(then)) return null
  const diff = then - Date.now()
  if (diff <= 0) return 'expired'
  return `expires in ${fmtQuantity(diff)}`
}

/** Render a 0..1 (or 0..100) number as a percentage label. */
export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const pct = value <= 1 ? value * 100 : value
  return `${Math.round(pct)}%`
}

/** Clamp a score into 0..100 percent for bar meters. */
export function pctOf(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0
  const pct = value <= 1 ? value * 100 : value
  return Math.min(100, Math.max(0, Math.round(pct)))
}
