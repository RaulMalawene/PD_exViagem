import axios from 'axios'
import router from '../router'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const isLoginRequest = error.config?.url?.includes('/login')

    if (error.response?.status === 401 && !isLoginRequest) {
      const authStore = useAuthStore()
      authStore.logout()

      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }

    // A API recusa tudo enquanto a password inicial nao for trocada. Sem tratar
    // este 403 o utilizador via ecras de erro por todo o lado sem perceber que
    // so tinha de definir uma password nova.
    if (error.response?.status === 403 && error.response?.data?.must_change_password) {
      const authStore = useAuthStore()
      authStore.flagPasswordChange()

      if (router.currentRoute.value.path !== '/definir-password') {
        router.push('/definir-password')
      }
    }

    return Promise.reject(error)
  }
)

export default api
