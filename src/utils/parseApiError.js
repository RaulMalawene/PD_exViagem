const GENERIC_MESSAGE = 'Sistema temporariamente indisponível. Tente novamente mais tarde.'

// Mensagens que vêm do interior do Laravel/PHP e nunca devem chegar ao ecrã.
// Nenhuma delas diz nada de útil a quem está a usar o sistema, e algumas
// revelam nomes de classes e tabelas.
const INTERNAL_PATTERNS = [
  /^no query results for model/i,
  /SQLSTATE/i,
  /^server error$/i,
  /call to a member function/i,
  /undefined (variable|property|method|index|array key)/i,
  /App\\(Models|Http|Services)\\/,
  /syntax error/i,
  /^attempt to read property/i,
  /Illuminate\\/,
  /^the route .* could not be found/i,
]

function isInternalMessage(message) {
  if (typeof message !== 'string' || !message.trim()) return true
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Converte um erro do axios numa mensagem apresentável.
 *
 * Erros de validação (o bloco `errors`) passam sempre, porque são escritos para
 * o utilizador. Tudo o resto é filtrado: mensagens internas do framework e
 * qualquer coisa a partir do 500 caem na mensagem genérica.
 */
export function parseApiError(err) {
  const status = err?.response?.status
  const data = err?.response?.data

  if (!data) return GENERIC_MESSAGE

  if (data.errors) {
    const first = Object.values(data.errors)[0]
    const message = Array.isArray(first) ? first[0] : first
    if (!isInternalMessage(message)) return message
  }

  if (status >= 500) return GENERIC_MESSAGE

  return isInternalMessage(data.message) ? GENERIC_MESSAGE : data.message
}

export { GENERIC_MESSAGE }
