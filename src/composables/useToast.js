import { ref } from 'vue'

const notification = ref(null)
let dismissTimer = null

export function useToast() {
  function showToast(type, message) {
    clearTimeout(dismissTimer)
    notification.value = { type, message }
    dismissTimer = setTimeout(() => {
      notification.value = null
    }, 3500)
  }

  return { notification, showToast }
}
