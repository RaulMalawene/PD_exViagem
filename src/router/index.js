import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, roleHomeRoute } from '../stores/authStore'
import { usePublicBookingStore } from '../stores/publicBookingStore'
import { ROLE_ADMIN, ROLE_MANAGER } from '../utils/roles'

const ADMIN_ONLY = [ROLE_ADMIN]
const MANAGEMENT = [ROLE_ADMIN, ROLE_MANAGER]

// Layouts
const DashboardLayout = () => import('../layouts/DashboardLayout.vue')
const PublicLayout = () => import('../layouts/PublicLayout.vue')

// Autenticacao
const Login = () => import('../pages/Login.vue')
const ChangePassword = () => import('../pages/ChangePassword.vue')

// Portal do cliente
const TripSearch = () => import('../pages/public/TripSearch.vue')
const TripResults = () => import('../pages/public/TripResults.vue')
const TripSeats = () => import('../pages/public/TripSeats.vue')
const PassengerDetails = () => import('../pages/public/PassengerDetails.vue')
const PaymentDetails = () => import('../pages/public/PaymentDetails.vue')
const BookingSuccess = () => import('../pages/public/BookingSuccess.vue')
const TicketVerify = () => import('../pages/public/TicketVerify.vue')

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
const AuditLogs = () => import('../pages/AuditLogs.vue')
const OccupancyReport = () => import('../pages/reports/OccupancyReport.vue')
const FinancialReport = () => import('../pages/reports/FinancialReport.vue')
// eslint-disable-next-line no-unused-vars -- rota comentada abaixo, ver changelog 091
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

  // Troca obrigatoria da password inicial. Fora do DashboardLayout de
  // proposito: enquanto a marca estiver de pe a API recusa tudo o resto, e um
  // painel cheio de erros nao ajudava ninguem a perceber o que fazer.
  {
    path: '/definir-password',
    name: 'change-password',
    component: ChangePassword,
    meta: { requiresAuth: true },
  },

  // Captura de foto do motorista (link externo via token)
  {
    path: '/captura-motorista/:token',
    component: DriverPhotoCapture,
  },

  // Verificacao de bilhete, aberta pelo QR code impresso.
  // O /b/ e o caminho curto que o QR usa: cada caracter a menos alivia a
  // densidade do codigo, e era isso que o impedia de ser lido em papel.
  // O /bilhete/ fica para os codigos ja impressos e para links partilhados.
  {
    path: '/b/:ticketNumber',
    component: TicketVerify,
  },
  {
    path: '/bilhete/:ticketNumber',
    component: TicketVerify,
  },

  // Portal publico do cliente
  {
    path: '/booking',
    component: PublicLayout,
    children: [
      {
        // Landing page - pesquisa de viagens
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

  // Painel de gestao. O `meta.roles` de cada ecra e a segunda linha de defesa:
  // as policies do backend continuam a ser a que conta, isto so evita que
  // alguem chegue por URL a uma pagina que depois so mostrava erros.
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
        meta: { roles: MANAGEMENT },
      },
      {
        // Gestao de motoristas
        path: 'drivers',
        component: Drivers,
        meta: { roles: ADMIN_ONLY },
      },
      {
        // Gestao de ajudantes
        path: 'helpers',
        component: Helpers,
        meta: { roles: ADMIN_ONLY },
      },
      {
        // Gestao de veiculos
        path: 'vehicles',
        component: Vehicles,
        meta: { roles: ADMIN_ONLY },
      },
      {
        // Viagens foi absorvida pela Dashboard (Home)
        path: 'trips',
        redirect: '/dashboard/home',
      },
      {
        path: 'bookings',
        component: Bookings,
      },
      {
        // Gestao de mercadorias (Correio / Drop off / Carga)
        path: 'shipments',
        component: Shipments,
        meta: { roles: MANAGEMENT },
      },
      {
        // Viagens completas (ida + volta) e relatorio financeiro
        path: 'round-trips',
        component: RoundTrips,
        meta: { roles: MANAGEMENT },
      },
      {
        // Gestao de horarios
        path: 'schedules',
        component: TripSchedules,
        meta: { roles: ADMIN_ONLY },
      },
      {
        // Gestao de rotas
        path: 'routes',
        component: Routes,
        meta: { roles: ADMIN_ONLY },
      },
      {
        // Gestao de utilizadores
        path: 'users',
        component: Users,
        meta: { roles: ADMIN_ONLY },
      },
      {
        // Histórico de alterações do sistema
        path: 'audit-logs',
        component: AuditLogs,
        meta: { roles: ADMIN_ONLY },
      },
      {
        // Relatorio de ocupacao por viagem
        path: 'reports/occupancy',
        component: OccupancyReport,
        meta: { roles: MANAGEMENT },
      },
      {
        // Relatorio financeiro
        path: 'reports/financial',
        component: FinancialReport,
        meta: { roles: MANAGEMENT },
      },
      // Relatorio de cancelamentos removido do menu a pedido (changelog 091).
      // O codigo fica todo no sitio - pagina, endpoint e PDF - para se poder
      // repor descomentando este bloco e o import respectivo.
      // {
      //   path: 'reports/cancellations',
      //   component: CancellationsReport,
      // },
      {
        // Relatorio de descontos aplicados
        path: 'reports/discounts',
        component: DiscountsReport,
        meta: { roles: MANAGEMENT },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Etapas do fluxo de reserva e o que cada uma precisa para funcionar. Uma query
// em falta significa que se chegou ali por um link velho ou pelo botao "voltar"
// depois de o estado ter sido limpo - nesse caso volta-se ao inicio em vez de
// chamar a API com valores vazios.
// O session_token deixou de viajar no URL — e a credencial do fluxo publico e
// ficava no historico e nos registos do servidor. Passou a vir do
// sessionStorage, por isso as etapas que dependem dele verificam-no no estado.
const bookingSteps = {
  'booking.seats': ['trip_id'],
  'booking.passengers': ['trip_id'],
  'booking.payment': ['trip_id'],
}

// Etapas que nao funcionam sem o token da sessao de reserva.
const stepsNeedingSession = ['booking.passengers', 'booking.payment']

// Um valor que veio de um objecto nulo chega ao URL como a string "null".
function hasValue(value) {
  return !!value && value !== 'null' && value !== 'undefined'
}

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta?.requiresAuth && !authStore.token) {
    return next('/login')
  }

  if (to.path === '/login' && authStore.token) {
    return next(roleHomeRoute(authStore.user?.role))
  }

  // Password inicial por trocar: a API recusa tudo menos o proprio perfil, por
  // isso nao vale a pena deixar entrar em ecra nenhum do painel. So se aplica
  // ao que exige sessao — o portal publico e a verificacao de bilhete ficam
  // acessiveis a quem por acaso tenha sessao aberta.
  if (to.meta?.requiresAuth && authStore.mustChangePassword && to.name !== 'change-password') {
    return next({ name: 'change-password', replace: true })
  }

  if (to.name === 'change-password' && authStore.token && !authStore.mustChangePassword) {
    return next({ path: roleHomeRoute(authStore.user?.role), replace: true })
  }

  // Ecra restrito a perfis que este utilizador nao tem: manda-o para a sua
  // pagina inicial em vez de mostrar uma pagina cheia de erros de permissao.
  const allowedRoles = to.meta?.roles

  if (allowedRoles && !allowedRoles.includes(authStore.user?.role)) {
    return next({ path: roleHomeRoute(authStore.user?.role), replace: true })
  }

  const required = bookingSteps[to.name]

  if (required) {
    const bookingStore = usePublicBookingStore()

    // Reserva ja paga: nao se volta para tras. Reencaminha para a confirmacao.
    if (bookingStore.isFlowCompleted()) {
      return next(bookingStore.completedSessionToken()
        ? { path: '/booking/success', replace: true }
        : { path: '/booking', replace: true })
    }

    if (required.some((key) => !hasValue(to.query[key]))) {
      return next({ path: '/booking', replace: true })
    }

    // Sem token nao ha sessao de reserva: chegou-se aqui por um link antigo ou
    // com o sessionStorage limpo. Volta-se ao inicio em vez de chamar a API
    // com um valor vazio.
    if (stepsNeedingSession.includes(to.name) && !hasValue(bookingStore.currentSessionToken())) {
      return next({ path: '/booking', replace: true })
    }

    // As reservas deixaram de viajar na query e vem so do estado. Sem elas a
    // tela de pagamento mostrava um total de zero em vez de dizer o que se
    // passa, por isso volta-se ao inicio.
    if (to.name === 'booking.payment' && !(bookingStore.flow.bookingGroup ?? []).length) {
      return next({ path: '/booking', replace: true })
    }
  }

  next()
})

export default router