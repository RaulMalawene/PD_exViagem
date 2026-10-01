<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTripScheduleStore } from '../stores/tripScheduleStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'

import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'
import StatiscSimple from '../components/StatiscSimple.vue'
import TableBase from '../components/TableBase.vue'
import BaseLoader from '../components/BaseLoader.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import IconText from '../components/IconText.vue'
import TripScheduleFormModal from '../modal/TripScheduleFormModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const scheduleStore = useTripScheduleStore()
const { schedules, pagination, loading } = storeToRefs(scheduleStore)
const { showToast } = useToast()

const loadError = ref(null)
const editingSchedule = ref(null)
const showFormModal = ref(false)
const deleteTarget = ref(null)
const deactivatingSchedule = ref(false)

const dayLabels = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const headers = ['Rota', 'Dia da semana', 'Hora de partida', 'Hora limite', 'Estado']

const rows = computed(() =>
  schedules.value.map((s) => ({
    id: s.id,
    route: s.route?.name ?? '--',
    day_of_week: dayLabels[s.day_of_week] ?? s.day_of_week,
    departure_time: s.departure_time?.slice(0, 5),
    latest_departure_time: s.latest_departure_time?.slice(0, 5),
    is_active: s.is_active ? 'Activo' : 'Inactivo',
  }))
)

function buildParams(page = 1) {
  return { page, per_page: 7, all: 1 }
}

async function fetchData(page = 1) {
  loadError.value = null

  try {
    await scheduleStore.fetchSchedules(buildParams(page))
  } catch (err) {
    // Sem isto o ecra ficava vazio e o utilizador julgava que
    // nao havia registos, quando na verdade a API tinha falhado.
    loadError.value = parseApiError(err)
  }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  fetchData(page)
}

function openCreate() {
  editingSchedule.value = null
  showFormModal.value = true
}

function openEdit(row) {
  editingSchedule.value = schedules.value.find((s) => s.id === row.id) ?? null
  showFormModal.value = true
}

function askDelete(row) {
  deleteTarget.value = row
}

function cancelDelete() {
  deleteTarget.value = null
}

async function confirmDeactivate() {
  deactivatingSchedule.value = true
  try {
    await scheduleStore.deactivateSchedule(deleteTarget.value.id)
    showToast('success', 'Horário desactivado com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deactivatingSchedule.value = false
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingSchedule.value = null
  if (saved) fetchData(pagination.value.current_page)
}

onMounted(() => fetchData())
</script>

<template>
  <div class="schedulesWrapper">
    <header>
      <Text txt="Horários" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <div class="spacer" />

        <div class="Data" @click="openCreate">
          <IconText
            icon="fi fi-rs-calendar-clock"
            txt="Novo Horário"
            color="#8B9B1A"
            background="#922877"
          />
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de horários" :data="pagination.total" />
      </div>

      <div class="table">
        <BaseLoader v-if="loading" />

        <ErrorState v-else-if="loadError" :message="loadError" @retry="fetchData()" />

        <EmptyState v-else-if="schedules.length === 0" title="Nenhum horário encontrado" message="Ainda não existem horários registados." />

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="flex"
            displayEye="none"
            @row-edit="openEdit"
            @row-delete="askDelete"
          />

          <Pagination :pagination="pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>

  <TripScheduleFormModal
    v-if="showFormModal"
    :schedule="editingSchedule"
    @close="closeForm"
  />

  <ConfirmDeleteModal
    v-if="deleteTarget"
    :title="`Desactivar o horário de ${deleteTarget.route}?`"
    subtitle="Este horário deixa de gerar novas viagens em massa. As viagens já criadas não são afectadas."
    :show-delete="false"
    :loading-deactivate="deactivatingSchedule"
    @cancel="cancelDelete"
    @confirm-deactivate="confirmDeactivate"
  />
</template>

<style scoped>
.schedulesWrapper {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

header {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 12px;
  flex-shrink: 0;
}

.filterData {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 40px;
}

.searchData {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  height: auto;
  gap: 12px;
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.spacer {
  flex: 1;
}

.Data {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  height: 100%;
  cursor: pointer;
}

.Statistcss {
  margin-top: 24px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  width: 100%;
  flex-shrink: 0;
}

.table {
  margin-top: 24px;
  width: 100%;
  background: white;
  padding: clamp(24px, 3.5vw, 60px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 767px) {
  .filterData {
    margin-top: 20px;
  }

  .searchData {
    flex-wrap: wrap;
  }

  .spacer {
    display: none;
  }

  .Data {
    width: 100%;
    height: auto;
  }

  .Data > div {
    width: 100%;
  }

  .Statistcss { margin-top: 20px; }

  .table {
    margin-top: 20px;
    padding: 16px;
  }

}
</style>
