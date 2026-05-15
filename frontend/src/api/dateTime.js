// All datetimes from the API are El Salvador wall-clock strings without a
// timezone designator (e.g. "2026-04-27T14:30:00"). Using `new Date(iso)` would
// reinterpret them in the BROWSER's local timezone, which shifts the displayed
// hour whenever the user opens the app from a device in another TZ.
//
// These helpers parse the wall-clock fields directly so what the customer
// reserves on the public booking page is exactly what the business owner sees
// in the admin panel — independent of either browser's timezone.

const SPANISH_WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const SPANISH_WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const SPANISH_MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

function parseWallClock(iso) {
  if (!iso) return null
  // Match yyyy-MM-ddTHH:mm[:ss[.fff]] with any/no TZ suffix.
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: m[4] != null ? Number(m[4]) : 0,
    minute: m[5] != null ? Number(m[5]) : 0,
    second: m[6] != null ? Number(m[6]) : 0,
  }
}

const pad2 = (n) => String(n).padStart(2, '0')

export function formatWallTime(iso) {
  const p = parseWallClock(iso)
  if (!p) return ''
  return `${pad2(p.hour)}:${pad2(p.minute)}`
}

export function formatWallDateLong(iso) {
  const p = parseWallClock(iso)
  if (!p) return ''
  // Use the parsed Y/M/D — Date is only used to derive day-of-week, with
  // explicit local construction so no UTC shifting happens.
  const d = new Date(p.year, p.month - 1, p.day)
  const wd = SPANISH_WEEKDAYS[d.getDay()]
  return `${wd}, ${p.day} de ${SPANISH_MONTHS[p.month - 1]}`
}

export function formatWallDateShort(iso) {
  const p = parseWallClock(iso)
  if (!p) return ''
  const d = new Date(p.year, p.month - 1, p.day)
  const wd = SPANISH_WEEKDAYS_SHORT[d.getDay()]
  return `${wd}, ${p.day} ${SPANISH_MONTHS_SHORT[p.month - 1]}`
}

export function formatWallDateTime(iso) {
  const p = parseWallClock(iso)
  if (!p) return ''
  const d = new Date(p.year, p.month - 1, p.day)
  const wd = SPANISH_WEEKDAYS_SHORT[d.getDay()]
  return `${wd}, ${p.day} ${SPANISH_MONTHS_SHORT[p.month - 1]} · ${pad2(p.hour)}:${pad2(p.minute)}`
}

export function wallClockHour(iso) {
  const p = parseWallClock(iso)
  return p ? p.hour : 0
}

// Returns the wall-clock hour as a fractional value (e.g. 14:30 → 14.5).
// Handy for time-grid positioning where Date.getHours()+getMinutes()/60 would
// otherwise reinterpret the value in the browser's local TZ.
export function wallClockHourFraction(iso) {
  const p = parseWallClock(iso)
  return p ? p.hour + p.minute / 60 : 0
}

// Returns yyyy-MM-dd of the wall-clock value (for date-equality checks).
export function wallClockDateKey(iso) {
  const p = parseWallClock(iso)
  if (!p) return ''
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

// Today's date in YYYY-MM-DD using the device's local clock — this is the
// right anchor for "is this in the past" comparisons in the UI.
export function todayDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// Compares wall-clock instants as numbers without going through Date parsing.
// Returns negative / 0 / positive, so it works with Array.sort.
export function compareWallClock(a, b) {
  return String(a).localeCompare(String(b))
}
