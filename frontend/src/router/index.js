import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '库存看板', icon: 'BarChartOutline' }
      },
      {
        path: 'category',
        name: 'Category',
        component: () => import('@/views/Category.vue'),
        meta: { title: '食材分类', icon: 'FolderOutline' }
      },
      {
        path: 'ingredient',
        name: 'Ingredient',
        component: () => import('@/views/Ingredient.vue'),
        meta: { title: '食材管理', icon: 'CubeOutline' }
      },
      {
        path: 'inbound',
        name: 'Inbound',
        component: () => import('@/views/Inbound.vue'),
        meta: { title: '入库登记', icon: 'ArrowDownCircleOutline' }
      },
      {
        path: 'outbound',
        name: 'Outbound',
        component: () => import('@/views/Outbound.vue'),
        meta: { title: '出库领料', icon: 'ArrowUpCircleOutline' }
      },
      {
        path: 'stocktake',
        name: 'Stocktake',
        component: () => import('@/views/Stocktake.vue'),
        meta: { title: '盘点管理', icon: 'ClipboardOutline' }
      },
      {
        path: 'stocktake/:id',
        name: 'StocktakeDetail',
        component: () => import('@/views/StocktakeDetail.vue'),
        meta: { title: '盘点详情', hidden: true }
      },
      {
        path: 'supplier',
        name: 'Supplier',
        component: () => import('@/views/Supplier.vue'),
        meta: { title: '供应商管理', icon: 'BusinessOutline' }
      },
      {
        path: 'warning',
        name: 'WarningConfig',
        component: () => import('@/views/WarningConfig.vue'),
        meta: { title: '预警配置', icon: 'AlertCircleOutline' }
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/Report.vue'),
        meta: { title: '出入库流水', icon: 'DocumentTextOutline' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth !== false && !userStore.token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && userStore.token) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
