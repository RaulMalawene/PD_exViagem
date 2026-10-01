import { useToast } from './useToast'
import { parseApiError } from '../utils/parseApiError'

/**
 * Carrega as listas que enchem os dropdowns dos formularios.
 *
 * As accoes fetchOptions() das stores propagam o erro. Chamadas a seco no
 * onMounted, um erro da API deixava os selects vazios e calados — o utilizador
 * via um formulario que parecia nao ter opcoes nenhumas. Aqui a falha e sempre
 * dita, e uma lista que falhe nao impede as outras de carregar.
 */
export function useDropdownOptions() {
  const { showToast } = useToast()

  return function loadOptions(...promises) {
    return Promise.allSettled(promises).then((results) => {
      const falhou = results.find((r) => r.status === 'rejected')

      if (falhou) {
        showToast('error', parseApiError(falhou.reason))
      }
    })
  }
}
