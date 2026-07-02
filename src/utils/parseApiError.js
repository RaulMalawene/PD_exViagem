export function parseApiError(err) {
  const data = err?.response?.data;
  if (!data) return "Erro interno. Tente novamente.";
  if (data.errors) {
    const first = Object.values(data.errors)[0];
    return Array.isArray(first) ? first[0] : first;
  }
  return data.message ?? "Erro interno. Tente novamente.";
}
