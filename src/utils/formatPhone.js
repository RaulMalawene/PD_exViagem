export function formatPhone(value) {
  if (!value) return value

  const match = String(value).match(/^\+(258|27)(\d+)$/)
  if (!match) return value

  return `+${match[1]} ${match[2]}`
}
