const CITY_CODES = {
  maputo: 'MPT',
  johannesburg: 'JHB',
}

function cityCode(city) {
  if (!city) return '--'

  const key = city.trim().toLowerCase()
  if (CITY_CODES[key]) return CITY_CODES[key]

  return city.trim().slice(0, 3).toUpperCase()
}

export function routeAbbr(route) {
  if (!route) return '--'

  return `${cityCode(route.origin)}->${cityCode(route.destination)}`
}
