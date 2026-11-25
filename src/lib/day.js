/**
 * Today, as a date input holds it: `YYYY-MM-DD` in local time.
 *
 * It used to live in `mocks/userTracks.js`, which made every screen that
 * needed a date pick up a dependency on a mock file. It is a plain date
 * helper and nothing to do with sample data, so it lives here.
 */
export function todayISO(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default todayISO
