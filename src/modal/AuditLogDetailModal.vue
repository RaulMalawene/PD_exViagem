<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../utils/formatDate'
import { actionLabel, entityLabel, fieldLabel, formatValue } from '../utils/auditLabels'

const props = defineProps({
  log: { type: Object, required: true },
})

defineEmits(['close'])

// Na actualizacao o backend guarda o registo anterior inteiro mas so os campos
// alterados no depois. Mostrar tudo tornava impossivel ver o que mudou, por
// isso a comparacao limita-se as chaves que estao no "depois".
const rows = computed(() => {
  const oldValues = props.log.old_values ?? {}
  const newValues = props.log.new_values ?? {}

  const keys = props.log.action === 'updated'
    ? Object.keys(newValues)
    : [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])]

  return keys
    .filter((key) => key !== 'updated_at')
    .map((key) => ({
      key,
      label: fieldLabel(key),
      before: formatValue(oldValues[key]),
      after: formatValue(newValues[key]),
    }))
})

const showBefore = computed(() => props.log.action !== 'created')
const showAfter = computed(() => props.log.action !== 'deleted')
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="$emit('close')">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">Detalhe da alteração</span>
            <button class="closeBtn" @click="$emit('close')">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="metaGrid">
              <div class="metaItem">
                <span class="metaLabel">Acção</span>
                <span class="badge" :class="`badge--${log.action}`">{{ actionLabel(log.action) }}</span>
              </div>
              <div class="metaItem">
                <span class="metaLabel">Entidade</span>
                <span class="metaValue">{{ entityLabel(log.entity) }} #{{ log.entity_id }}</span>
              </div>
              <div class="metaItem">
                <span class="metaLabel">Utilizador</span>
                <span class="metaValue">{{ log.performed_by?.name ?? 'Sistema' }}</span>
              </div>
              <div class="metaItem">
                <span class="metaLabel">Data</span>
                <span class="metaValue">{{ formatDateTime(log.created_at) }}</span>
              </div>
              <div class="metaItem">
                <span class="metaLabel">Endereço IP</span>
                <span class="metaValue">{{ log.ip_address ?? '-' }}</span>
              </div>
              <div class="metaItem full">
                <span class="metaLabel">Dispositivo</span>
                <span class="metaValue small">{{ log.user_agent ?? '' }}</span>
              </div>
            </div>

            <div v-if="rows.length" class="changes">
              <div class="changesHead">
                <span>Campo</span>
                <span v-if="showBefore">Antes</span>
                <span v-if="showAfter">Depois</span>
              </div>

              <div v-for="row in rows" :key="row.key" class="changesRow">
                <span class="fieldName">{{ row.label }}</span>
                <span v-if="showBefore" class="before">{{ row.before }}</span>
                <span v-if="showAfter" class="after">{{ row.after }}</span>
              </div>
            </div>

            <p v-else class="noChanges">Sem valores registados para esta alteração.</p>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="$emit('close')">Fechar</button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modalCard {
  width: 100%;
  max-width: 720px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modalHeader {
  background: #922877;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modalTitle {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}

.closeBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: background 0.15s;
}

.closeBtn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.modalBody {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.metaGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

.metaItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.metaItem.full {
  grid-column: 1 / -1;
}

.metaLabel {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #999;
}

.metaValue {
  font-size: 13.5px;
  color: #221F20;
  word-break: break-word;
}

.metaValue.small {
  font-size: 11.5px;
  color: #777;
}

.badge {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge--created { background: #E7F5EC; color: #1E7C43; }
.badge--updated { background: #FDF6E7; color: #B9770E; }
.badge--deleted { background: #FDECEA; color: #C0392B; }

.changes {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}

.changesHead,
.changesRow {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  padding: 10px 14px;
  font-size: 13px;
}

.changesHead {
  background: #FAFAFA;
  font-weight: 600;
  color: #666;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.changesRow + .changesRow {
  border-top: 1px solid #f4f4f4;
}

.fieldName {
  font-weight: 600;
  color: #333;
}

.before {
  color: #C0392B;
  word-break: break-word;
}

.after {
  color: #1E7C43;
  word-break: break-word;
}

.noChanges {
  font-size: 13px;
  color: #999;
  text-align: center;
  padding: 20px 0;
}

.modalFooter {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.btnSecondary {
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  background: #f0f0f0;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btnSecondary:hover {
  background: #e0e0e0;
}

@media (max-width: 640px) {
  .changesHead,
  .changesRow {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .changesHead {
    display: none;
  }

  .before::before { content: 'Antes: '; color: #999; }
  .after::before { content: 'Depois: '; color: #999; }
}

.overlay-enter-active,
.overlay-leave-active { transition: opacity 0.2s ease; }

.overlay-enter-from,
.overlay-leave-to { opacity: 0; }

.modal-enter-active,
.modal-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }

.modal-enter-from,
.modal-leave-to { opacity: 0; transform: translateY(14px) scale(0.98); }
</style>
