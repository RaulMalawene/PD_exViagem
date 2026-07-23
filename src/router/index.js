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
const Helpers = () => import('../pages/Helpers.vue')
const Vehicles = () => import('../pages/Vehicles.vue')
const Routes = () => import('../pages/Routes.vue')
const TripSchedules = () => import('../pages/TripSchedules.vue')
const Bookings = () => import('../pages/Bookings.vue')
const Shipments = () => import('../pages/Shipments.vue')
const RoundTrips = () => import('../pages/RoundTrips.vue')
const Users = () => import('../pages/Users.vue')
const OccupancyReport = () => import('../pages/reports/OccupancyReport.vue')
const FinancialReport = () => import('../pages/reports/FinancialReport.vue')
const CancellationsReport = () => import('../pages/reports/CancellationsReport.vue')
const DiscountsReport = () => import('../pages/reports/DiscountsReport.vue')

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
        // Seleccao de assentos
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
        // Gestao de ajudantes
        path: 'helpers',
        component: Helpers,
      },
      {
        // Gestao de veiculos
        path: 'vehicles',
        component: Vehicles,
      },
      {
        // Viagens foi absorvida pela Dashboard (Home)
        path: 'trips',
        redirect: '/dashboard/home',
      },
      {
        // Gestao de reservas
        path: 'bookings',
        component: Bookings,
      },
      {
        // Gestao de mercadorias (Correio / Drop off / Carga)
        path: 'shipments',
        component: Shipments,
      },
      {
        // Viagens completas (ida + volta) e relatorio financeiro
        path: 'round-trips',
        component: RoundTrips,
      },
      {
        // Gestao de horarios
        path: 'schedules',
        component: TripSchedules,
      },
      {
        // Gestao de rotas
        path: 'routes',
        component: Routes,
      },
      {
        // Gestao de utilizadores
        path: 'users',
        component: Users,
      },
      {
        // Relatorio de ocupacao por viagem
        path: 'reports/occupancy',
        component: OccupancyReport,
      },
      {
        // Relatorio financeiro
        path: 'reports/financial',
        component: FinancialReport,
      },
      {
        // Relatorio de cancelamentos
        path: 'reports/cancellations',
        component: CancellationsReport,
      },
      {
        // Relatorio de descontos aplicados
        path: 'reports/discounts',
        component: DiscountsReport,
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