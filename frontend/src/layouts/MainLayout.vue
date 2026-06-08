<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="logo" :style="{ padding: collapsed ? '16px 8px' : '16px 20px' }">
        <n-icon size="28" color="#18a058">
          <CubeOutline />
        </n-icon>
        <span v-if="!collapsed" class="logo-text">库存管理系统</span>
      </div>
      <n-menu
        :collapsed-width="64"
        :collapsed="collapsed"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="route.name"
        @update:value="handleMenuClick"
      />
    </n-layout-sider>
    <n-layout>
      <n-layout-header bordered style="height: 64px; padding: 0 24px;">
        <div class="header-content">
          <div class="header-title">
            <n-breadcrumb>
              <n-breadcrumb-item v-for="item in breadcrumbs" :key="item">
                {{ item }}
              </n-breadcrumb-item>
            </n-breadcrumb>
          </div>
          <div class="header-user">
            <n-dropdown :options="userOptions" @select="handleUserSelect">
              <div class="user-info" style="cursor: pointer;">
                <n-avatar round size="32">
                  {{ userStore.userInfo.name ? userStore.userInfo.name.charAt(0) : 'U' }}
                </n-avatar>
                <span class="user-name">{{ userStore.userInfo.name || '用户' }}</span>
                <n-icon size="14"><ChevronDownOutline /></n-icon>
              </div>
            </n-dropdown>
          </div>
        </div>
      </n-layout-header>
      <n-layout-content content-style="padding: 24px;">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>

    <n-modal
      v-model:show="warningModalVisible"
      preset="card"
      title="库存预警提醒"
      :mask-closable="false"
      style="width: 640px; max-height: 80vh;"
    >
      <div class="stock-warning-modal">
        <n-alert type="warning" :show-icon="true" style="margin-bottom: 16px;">
          当前有 <strong style="color: #d03050;">{{ warningList.length }}</strong> 种食材库存低于预警阈值，建议及时补货
        </n-alert>
        <div v-if="warningList.length > 0" class="warning-list">
          <div v-for="item in warningList" :key="item.id" class="warning-item">
            <div class="warning-item-info">
              <div class="warning-item-name">
                <n-tag type="warning" size="small" round>低库存</n-tag>
                <span class="name">{{ item.ingredientName }}</span>
              </div>
              <div class="warning-item-detail">
                <span>分类：{{ item.categoryName || '-' }}</span>
                <span>规格：{{ item.spec || '-' }}</span>
              </div>
              <div class="warning-item-stock">
                <span class="label">当前库存：</span>
                <span class="value danger">{{ item.currentValue }} {{ item.unit }}</span>
                <span class="label" style="margin-left: 16px;">预警阈值：</span>
                <span class="value">{{ item.thresholdValue }} {{ item.unit }}</span>
              </div>
            </div>
            <div class="warning-item-action">
              <n-button size="small" type="success" @click="handleMarkHandled(item)">
                已处理
              </n-button>
            </div>
          </div>
        </div>
        <div v-else class="empty-tip">
          暂无预警
        </div>
      </div>
      <template #footer>
        <n-space justify="space-between">
          <n-button quaternary size="small" @click="goToIngredientPage">
            <template #icon><CubeOutline /></template>
            查看所有食材
          </n-button>
          <n-space>
            <n-button size="small" type="primary" ghost @click="handleBatchMarkHandled" v-if="warningList.length > 0">
              全部标记已处理
            </n-button>
            <n-button size="small" @click="warningModalVisible = false">
              关闭
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>
  </n-layout>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, useDialog, NIcon } from 'naive-ui'
import {
  BarChartOutline,
  FolderOutline,
  CubeOutline,
  ArrowDownCircleOutline,
  ArrowUpCircleOutline,
  ClipboardOutline,
  BusinessOutline,
  AlertCircleOutline,
  DocumentTextOutline,
  LogOutOutline,
  PersonOutline,
  ChevronDownOutline
} from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import {
  getPendingStockWarnings,
  handleWarningLog,
  batchHandleWarningLogs
} from '@/api/warning'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()

const collapsed = ref(false)
const warningModalVisible = ref(false)
const warningList = ref([])
const pendingWarningCount = ref(0)

provide('pendingWarningCount', pendingWarningCount)
provide('refreshWarnings', fetchWarnings)

async function fetchWarnings() {
  try {
    const res = await getPendingStockWarnings()
    warningList.value = res.data?.list || []
    pendingWarningCount.value = res.data?.count || warningList.value.length
    if (warningList.value.length > 0 && !warningModalVisible.value) {
      const hasShown = sessionStorage.getItem('warning_shown')
      if (!hasShown) {
        warningModalVisible.value = true
        sessionStorage.setItem('warning_shown', '1')
      }
    }
  } catch (e) {
    console.error('获取预警列表失败', e)
  }
}

async function handleMarkHandled(item) {
  try {
    await handleWarningLog(item.id, { status: 'handled' })
    message.success('已标记为处理')
    warningList.value = warningList.value.filter(w => w.id !== item.id)
    pendingWarningCount.value = warningList.value.length
  } catch (e) {
    message.error('操作失败')
  }
}

async function handleBatchMarkHandled() {
  if (warningList.value.length === 0) return
  try {
    const ids = warningList.value.map(w => w.id)
    await batchHandleWarningLogs({ ids, status: 'handled' })
    message.success('已全部标记为处理')
    warningList.value = []
    pendingWarningCount.value = 0
    warningModalVisible.value = false
  } catch (e) {
    message.error('操作失败')
  }
}

function goToIngredientPage() {
  warningModalVisible.value = false
  router.push({ name: 'Ingredient', query: { lowStock: '1' } })
}

const iconMap = {
  BarChartOutline,
  FolderOutline,
  CubeOutline,
  ArrowDownCircleOutline,
  ArrowUpCircleOutline,
  ClipboardOutline,
  BusinessOutline,
  AlertCircleOutline,
  DocumentTextOutline
}

const menuOptions = computed(() => {
  return router.options.routes
    .find(r => r.path === '/')?.children
    .filter(r => r.meta && !r.meta.hidden)
    .map(r => ({
      label: r.meta.title,
      key: r.name,
      icon: () => h(NIcon, null, { default: () => h(iconMap[r.meta.icon]) })
    }))
})

import { h } from 'vue'

const breadcrumbs = computed(() => {
  if (route.meta.title) {
    return ['首页', route.meta.title]
  }
  return ['首页']
})

const userOptions = [
  { label: '个人信息', key: 'profile', icon: () => h(NIcon, null, { default: () => h(PersonOutline) }) },
  { label: '退出登录', key: 'logout', icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }) }
]

function handleMenuClick(key) {
  router.push({ name: key })
}

function handleUserSelect(key) {
  if (key === 'logout') {
    dialog.warning({
      title: '确认退出',
      content: '确定要退出登录吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        userStore.logout()
        message.success('已退出登录')
        sessionStorage.removeItem('warning_shown')
        router.push({ name: 'Login' })
      }
    })
  }
}

onMounted(() => {
  if (userStore.token) {
    fetchWarnings()
  }
})
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #18a058;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.header-title {
  font-size: 14px;
}

.header-user {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
  color: #333;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.stock-warning-modal {
  max-height: 60vh;
  overflow-y: auto;
}

.warning-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.warning-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff7e6;
  border: 1px solid #ffe58f;
  border-radius: 6px;
  gap: 12px;
}

.warning-item-info {
  flex: 1;
  min-width: 0;
}

.warning-item-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.warning-item-name .name {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.warning-item-name .code {
  font-size: 12px;
  color: #8c8c8c;
}

.warning-item-detail {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #595959;
  margin-bottom: 6px;
}

.warning-item-stock {
  font-size: 13px;
}

.warning-item-stock .label {
  color: #8c8c8c;
}

.warning-item-stock .value {
  color: #262626;
  font-weight: 500;
}

.warning-item-stock .value.danger {
  color: #d03050;
  font-weight: 600;
}

.warning-item-action {
  flex-shrink: 0;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #bfbfbf;
  font-size: 14px;
}
</style>
