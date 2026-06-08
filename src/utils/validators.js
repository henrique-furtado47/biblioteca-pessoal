export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export function isStrongEnough(password) {
  return String(password || '').length >= 6
}

export function cleanIsbn(value) {
  return String(value || '').replace(/[^0-9Xx]/g, '')
}

export function isValidIsbn(value) {
  const c = cleanIsbn(value)
  return c.length === 10 || c.length === 13
}
