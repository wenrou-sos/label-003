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
  </n-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
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

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()

const collapsed = ref(false)

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
        router.push({ name: 'Login' })
      }
    })
  }
}
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
</style>
