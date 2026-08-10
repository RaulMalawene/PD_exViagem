// Espelham o AuditLog::ACTIONS e o AuditLog::ENTITY_LABELS do backend.
export const ACTION_LABELS = {
  created: 'Criado',
  updated: 'Actualizado',
  deleted: 'Eliminado',
}

export const ENTITY_LABELS = {
  booking: 'Reserva',
  invoice: 'Factura',
  shipment: 'Mercadoria',
  trip: 'Viagem',
  user: 'Utilizador',
  vehicle: 'Veículo',
  route: 'Rota',
  driver: 'Motorista',
  helper: 'Ajudante',
  round_trip: 'Viagem completa',
}

export const FIELD_LABELS = {
  name: 'Nome',
  email: 'Email',
  role: 'Perfil',
  is_active: 'Activo',
  plate: 'Matrícula',
  trailer_plate: 'Matrícula da trela',
  model: 'Modelo',
  brand: 'Marca',
  capacity: 'Capacidade',
  status: 'Estado',
  seat_number: 'Lugar',
  ticket_number: 'Nº do bilhete',
  invoice_number: 'Nº da factura',
  total_amount: 'Total',
  subtotal_amount: 'Subtotal',
  discount_amount: 'Desconto',
  discount_reason: 'Motivo do desconto',
  payment_method: 'Método de pagamento',
  paid_at: 'Pago em',
  currency: 'Moeda',
  departure_date: 'Data de partida',
  departure_time: 'Hora de partida',
  permit_number: 'Nº do permit',
  notes: 'Notas',
  quantity: 'Quantidade',
  tag_code: 'Código da etiqueta',
  description: 'Descrição',
  created_at: 'Criado em',
  updated_at: 'Actualizado em',
}

export function actionLabel(action) {
  return ACTION_LABELS[action] ?? action
}

export function entityLabel(entity) {
  return ENTITY_LABELS[entity] ?? entity
}

export function fieldLabel(field) {
  return FIELD_LABELS[field] ?? field
}

export const actionFilterOptions = Object.entries(ACTION_LABELS).map(([value, label]) => ({ label, value }))
export const entityFilterOptions = Object.entries(ENTITY_LABELS).map(([value, label]) => ({ label, value }))

export function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
