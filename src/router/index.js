import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, roleHomeRoute } from '../stores/authStore'

// Layouts
const DashboardLayout = () => import('../layouts/DashboardLayout.vue')
const PublicLayout = () => import('../layouts/PublicLayout.vue')

// Autenticacao
const Login = () => import('../pages/Login.vue')

// Portal do cliente
const TripSearch = () => import('../pages/public/TripSearch.vue')
const TripResults = () => import('../pages/public/TripResults.vue')
const TripSeats = () => import('../pages/public/TripSeats.vue')
const PassengerDetails = () => import('../pages/public/PassengerDetails.vue')
const PaymentDetails = () => import('../pages/public/PaymentDetails.vue')
const BookingSuccess = () => import('../pages/public/BookingSuccess.vue')

// Painel de gestao
const Home = () => import('../pages/Home.vue')
const Drivers = () => import('../pages/Drivers.vue')
const Vehicles = () => import('../pages/Vehicles.vue')
const Trips = () => import('../pages/Trips.vue')
const InDevelopment = () => import('../pages/InDevelopment.vue')

// Paginas especiais
const DriverPhotoCapture = () => import('../pages/DriverPhotoCapture.vue')

const routes = [
  {
    path: '/',
    redirect: '/booking',
  },

  // Login
  {
    path: '/login',
    component: Login,
  },

  // Captura de foto do motorista (link externo via token)
  {
    path: '/captura-motorista/:token',
    component: DriverPhotoCapture,
  },

  // Portal publico do cliente
  {
    path: '/booking',
    component: PublicLayout,
    children: [
      {
        // Landing page — pesquisa de viagens
        path: '',
        name: 'booking.search',
        component: TripSearch,
      },
      {
        // Lista de viagens disponiveis
        path: 'results',
        name: 'booking.results',
        component: TripResults,
      },
      {
        // Seleccao de assentos - mapa de lugares com hold de 10min
        path: 'seats',
        name: 'booking.seats',
        component: TripSeats,
      },
      {
        // Dados do passageiro
        path: 'passengers',
        name: 'booking.passengers',
        component: PassengerDetails,
      },
      {
        // Pagamento e confirmacao dos bilhetes
        path: 'payment',
        name: 'booking.payment',
        component: PaymentDetails,
      },
      {
        // Confirmacao final apos pagamento
        path: 'success',
        name: 'booking.success',
        component: BookingSuccess,
      },
    ],
  },

  // Painel de gestao (admin e staff)
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard/home',
      },
      {
        // Dashboard principal
        path: 'home',
        component: Home,
      },
      {
        // Gestao de motoristas
        path: 'drivers',
        component: Drivers,
      },
      {
        // Gestao de veiculos
        path: 'vehicles',
        component: Vehicles,
      },
      {
        // Gestao de viagens
        path: 'trips',
        component: Trips,
      },
      {
        // Gestao de reservas - por implementar
        path: 'bookings',
        component: InDevelopment,
        props: { title: 'Reservas' },
      },
      {
        // Gestao de horarios - por implementar
        path: 'schedules',
        component: InDevelopment,
        props: { title: 'Horários' },
      },
      {
        // Gestao de rotas - por implementar
        path: 'routes',
        component: InDevelopment,
        props: { title: 'Rotas' },
      },
      {
        // Gestao de utilizadores - por implementar
        path: 'users',
        component: InDevelopment,
        props: { title: 'Utilizadores' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta?.requiresAuth && !authStore.token) {
    return next('/login')
  }

  if (to.path === '/login' && authStore.token) {
    return next(roleHomeRoute(authStore.user?.role))
  }

  next()
})

export default router