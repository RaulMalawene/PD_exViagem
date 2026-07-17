<script setup>
defineProps({
  title: { type: String, default: 'Eliminar?' },
  subtitle: { type: String, default: 'Esta acção é irreversível. Tem a certeza que deseja eliminar?' },
  icon: { type: String, default: 'fi fi-sr-trash' },
  showDeactivate: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: true },
  deleteLabel: { type: String, default: 'Eliminar definitivamente' },
  deleteLoadingLabel: { type: String, default: 'A eliminar...' },
  loadingDelete: { type: Boolean, default: false },
  loadingDeactivate: { type: Boolean, default: false },
})

const emit = defineEmits(['confirm-delete', 'confirm-deactivate', 'cancel'])
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="emit('cancel')">
      <Transition name="modal" appear>
        <div class="deleteModal">
          <i :class="icon" class="deleteIcon" />
          <h2 class="deleteTitle">{{ title }}</h2>
          <p class="deleteSubtitle">{{ subtitle }}</p>

          <div class="deleteActions">
            <button class="btnCancel" @click="emit('cancel')">Cancelar</button>
            <button v-if="showDeactivate" class="btnDeactivate" :disabled="loadingDelete || loadingDeactivate"
              @click="emit('confirm-deactivate')">
              {{ loadingDeactivate ? 'A desactivar...' : 'Desactivar' }}
            </button>
            <button v-if="showDelete" class="btnDelete" :disabled="loadingDelete || loadingDeactivate"
              @click="emit('confirm-delete')">
              {{ loadingDelete ? deleteLoadingLabel : deleteLabel }}
            </button>
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
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.deleteModal {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 32px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.deleteIcon {
  font-size: 38px;
  color: #e74c3c;
  margin-bottom: 4px;
}

.deleteTitle {
  font-size: 20px;
  font-weight: 700;
  color: #221F20;
}

.deleteSubtitle {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.deleteActions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
}

.btnCancel,
.btnDeactivate,
.btnDelete {
  width: 100%;
  height: 42px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: 'Ubuntu', sans-serif;
}

.btnCancel {
  background: #f0f0f0;
  color: #444;
  order: 1;
}

.btnCancel:hover {
  background: #e4e4e4;
}

.btnDeactivate {
  background: #efe6ef;
  color: #922877;
  order: 2;
}

.btnDeactivate:hover:not(:disabled) {
  opacity: 0.85;
}

.btnDelete {
  background: #e74c3c;
  color: #fff;
  order: 3;
}

.btnDelete:hover:not(:disabled) {
  opacity: 0.88;
}

.btnDeactivate:disabled,
.btnDelete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
