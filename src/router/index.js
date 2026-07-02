import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore, roleHomeRoute } from '../stores/authStore'

const Login = () => import('../pages/Login.vue')
const DashboardLayout = () => import('../layouts/DashboardLayout.vue')
const Home = () => import('../pages/Home.vue')

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    component: Login,
  },
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
        path: 'home',
        component: Home,
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
