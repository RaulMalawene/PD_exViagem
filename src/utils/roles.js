// Perfis de acesso. Espelham o enum `role` da tabela users no backend —
// mexer aqui sem mexer la (e na migration) parte as permissoes.
export const ROLE_ADMIN = 'admin'
export const ROLE_MANAGER = 'manager'
export const ROLE_FIELD_AGENT = 'field_agent'

export const ROLE_LABELS = {
  [ROLE_ADMIN]: 'Administrador',
  [ROLE_MANAGER]: 'Gestor',
  [ROLE_FIELD_AGENT]: 'Agente de campo',
}

export const ROLE_DESCRIPTIONS = {
  [ROLE_ADMIN]: 'Acesso total, incluindo utilizadores e configuração.',
  [ROLE_MANAGER]: 'Reservas, mercadorias, viagens completas e relatórios.',
  [ROLE_FIELD_AGENT]: 'Apenas reservas: vende bilhetes, cobra e regista bagagens.',
}

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? ''
}

// Para o InputDropDown, que espera { id, name }.
export const roleOptions = Object.entries(ROLE_LABELS).map(([id, name]) => ({ id, name }))

// Para o FilterDropDown, que espera { label, value }.
export const roleFilterOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ label, value }))
