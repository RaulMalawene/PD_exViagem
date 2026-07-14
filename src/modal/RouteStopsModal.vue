<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useStopStore } from '../stores/stopStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import TableBase from '../components/TableBase.vue'
import IconText from '../components/IconText.vue'
import StopFormModal from './StopFormModal.vue'

const props = defineProps({
  route: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const stopStore = useStopStore()
const { stops, loading } = storeToRefs(stopStore)
const { showToast } = useToast()

const editingStop = ref(null)
const showFormModal = ref(false)

const typeLabels = {
  departure: 'Partida',
  transit: 'Trânsito',
  border: 'Fronteira',
  arrival: 'Chegada',
}

const headers = ['Nome', 'Ordem', 'Tipo', 'Embarque', 'Hora']

const rows = computed(() =>
  stops.value.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    type: typeLabels[s.type] ?? s.type,
    is_boarding_point: s.is_boarding_point ? 'Sim' : 'Não',
    boarding_time: s.boarding_time ? s.boarding_time.slice(0, 5) : '--',
  }))
)

const nextOrder = computed(() => {
  if (!stops.value.length) return 1
  return Math.max(...stops.value.map((s) => s.order)) + 1
})

async function fetchData() {
  await stopStore.fetchStops(props.route.id)
}

function openCreate() {
  editingStop.value = null
  showFormModal.value = true
}

function openEdit(row) {
  editingStop.value = stops.value.find((s) => s.id === row.id) ?? null
  showFormModal.value = true
}

async function deleteStop(row) {
  if (!confirm(`Eliminar definitivamente a paragem "${row.name}"? Esta acção não pode ser desfeita.`)) return

  try {
    await stopStore.removeStop(row.id)
    showToast('success', 'Paragem eliminada.')
    fetchData()
  } catch (err) {
    showToast('error', parseApiError(err))
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingStop.value = null
  if (saved) fetchData()
}

function handleClose() {
  emit('close')
}

onMounted(fetchData)
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">Paragens da rota: {{ route.name }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="actionsRow">
              <div class="addBtn" @click="openCreate">
                <IconText icon="fi fi-rs-add" txt="Adicionar paragem" color="#8B9B1A" background="#922877" />
              </div>
            </div>

            <div v-if="loading" class="loaderWrapper">
              <div class="loader"></div>
            </div>

            <div v-else-if="stops.length === 0" class="emptyState">
              <i class="fi fi-sr-folder-open emptyIcon"></i>
              <p class="emptyText">Ainda não existem paragens registadas para esta rota.</p>
            </div>

            <TableBase
              v-else
              :headers="headers"
              :rows="rows"
              displayIcon="flex"
              displayEye="none"
              @row-edit="openEdit"
              @row-delete="deleteStop"
            />
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <StopFormModal
    v-if="showFormModal"
    :route-id="route.id"
    :stop="editingStop"
    :next-order="nextOrder"
    @close="closeForm"
  />
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
  max-width: 920px;
  max-height: calc(100vh - 190px);
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
  gap: 16px;
}

.actionsRow {
  display: flex;
  justify-content: flex-end;
}

.addBtn {
  cursor: pointer;
}

.loaderWrapper,
.emptyState {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.emptyIcon {
  font-size: 40px;
  color: #922877;
  opacity: 0.4;
}

.emptyText {
  font-size: 13px;
  color: #999;
  text-align: center;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
</style>
