export function formatDate(value) {
  if (!value) return '—'
  // Datas "YYYY-MM-DD" são interpretadas como LOCAIS (sem o T elas viram UTC,
  // o que adianta/atrasa 1 dia conforme o fuso). Adicionar a hora local evita isso.
  const v = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function initialsOf(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
