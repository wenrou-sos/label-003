<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <n-icon size="40" color="#18a058">
          <CubeOutline />
        </n-icon>
        <h1 class="login-title">库存管理系统</h1>
        <p class="login-subtitle">Inventory Management System</p>
      </div>
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="top"
        size="large"
      >
        <n-form-item label="用户名" path="username">
          <n-input
            v-model:value="formData.username"
            placeholder="请输入用户名"
            clearable
          >
            <template #prefix>
              <n-icon><PersonOutline /></n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <n-icon><LockClosedOutline /></n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item>
          <n-button
            type="primary"
            block
            size="large"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </n-button>
        </n-form-item>
      </n-form>
      <div class="login-footer">
        <n-text depth="3" style="font-size: 12px;">
          默认账号：admin / admin123
        </n-text>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { CubeOutline, PersonOutline, LockClosedOutline } from '@vicons/ionicons5'
import { login as loginApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

const formRef = ref(null)
const loading = ref(false)

const formData = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }

  loading.value = true
  try {
    const res = await loginApi(formData)
    if (res.code === 0 || res.token) {
      userStore.setToken(res.token || res.data?.token)
      userStore.setUserInfo(res.user || res.data?.user)
      message.success('登录成功')
      const redirect = route.query.redirect || '/dashboard'
      router.push(redirect)
    } else {
      message.error(res.message || '登录失败')
    }
  } catch (e) {
    message.error(e.response?.data?.message || e.message || '登录失败，请检查账号密码')
    console.error('login error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  margin: 12px 0 4px;
  font-size: 24px;
  color: #333;
  font-weight: 600;
}

.login-subtitle {
  margin: 0;
  font-size: 13px;
  color: #999;
}

.login-footer {
  margin-top: 16px;
  text-align: center;
}
</style>
