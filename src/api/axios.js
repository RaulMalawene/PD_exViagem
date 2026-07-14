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

    return Promise.reject(error)
  }
)

export default api
