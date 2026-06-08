<template>
  <div class="page-container">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><BusinessOutline /></n-icon>
            <span>供应商管理</span>
          </div>
          <n-button type="primary" @click="handleAdd">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新增供应商
          </n-button>
        </div>
      </template>

      <n-space style="margin-bottom: 16px;">
        <n-input v-model:value="filters.keyword" placeholder="搜索供应商名称/联系人" clearable style="width: 280px;" />
        <n-button @click="fetchData">查询</n-button>
        <n-button @click="resetFilters">重置</n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="dataList"
        :loading="loading"
        :pagination="pagination"
        remote
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>

    <n-modal
      v-model:show="modalVisible"
      preset="card"
      :title="isEdit ? '编辑供应商' : '新增供应商'"
      style="width: 520px;"
      @positive-click="handleSubmit"
      @negative-click="modalVisible = false"
      positive-text="确定"
      negative-text="取消"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="top"
        label-width="100"
      >
        <n-form-item label="供应商名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入供应商名称" />
        </n-form-item>
        <n-form-item label="联系人" path="contact">
          <n-input v-model:value="formData.contact" placeholder="请输入联系人" />
        </n-form-item>
        <n-form-item label="联系电话" path="phone">
          <n-input v-model:value="formData.phone" placeholder="请输入联系电话" />
        </n-form-item>
        <n-form-item label="邮箱" path="email">
          <n-input v-model:value="formData.email" placeholder="请输入邮箱" />
        </n-form-item>
        <n-form-item label="地址" path="address">
          <n-input v-model:value="formData.address" placeholder="请输入地址" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="formData.remark" type="textarea" placeholder="请输入备注（可选）" />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, useDialog, NButton, NIcon, NTag } from 'naive-ui'
import { BusinessOutline, AddOutline, PencilOutline, TrashOutline, EyeOutline, CallOutline, MailOutline } from '@vicons/ionicons5'
import { getSupplierList, createSupplier, updateSupplier, deleteSupplier } from '@/api/supplier'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const dataList = ref([])

const modalVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)

const formData = reactive({
  id: null,
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  remark: ''
})

const rules = {
  name: [
    { required: true, message: '请输入供应商名称', trigger: 'blur' }
  ],
  contact: [
    { required: true, message: '请输入联系人', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' }
  ]
}

const filters = reactive({
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const columns = [
  { title: '供应商名称', key: 'name', minWidth: 200 },
  { title: '联系人', key: 'contact', width: 120 },
  {
    title: '联系电话',
    key: 'phone',
    width: 140,
    render: (row) => row.phone ? h('span', null, [h(NIcon, { size: 14, style: 'margin-right: 4px;' }, { default: () => h(CallOutline) }), row.phone]) : '-'
  },
  {
    title: '邮箱',
    key: 'email',
    width: 200,
    render: (row) => row.email ? h('span', null, [h(NIcon, { size: 14, style: 'margin-right: 4px;' }, { default: () => h(MailOutline) }), row.email]) : '-'
  },
  { title: '地址', key: 'address', minWidth: 200, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: row.status === 1 ? 'success' : 'error', size: 'small' }, { default: () => row.status === 1 ? '合作中' : '已停用' })
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, { size: 'small', text: true, onClick: () => handleView(row) }, {
        icon: () => h(NIcon, null, { default: () => h(EyeOutline) }),
        default: () => '查看'
      }),
      h(NButton, { size: 'small', text: true, onClick: () => handleEdit(row) }, {
        icon: () => h(NIcon, null, { default: () => h(PencilOutline) }),
        default: () => '编辑'
      }),
      h(NButton, { size: 'small', text: true, type: 'error', onClick: () => handleDelete(row) }, {
        icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
        default: () => '删除'
      })
    ])
  }
]

async function fetchData() {
  loading.value = true
  try {
    const res = await getSupplierList({ ...filters, page: pagination.page, pageSize: pagination.pageSize })
    dataList.value = res.data?.list || res.data || []
    pagination.itemCount = res.data?.total || 0
  } catch (e) {
    dataList.value = []
    pagination.itemCount = 0
    console.error('fetch supplier list error:', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  fetchData()
}

function handlePageChange(page) {
  pagination.page = page
  fetchData()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  fetchData()
}

function handleAdd() {
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    remark: ''
  })
  modalVisible.value = true
}

function handleView(row) {
  message.info('查看详情功能待开发')
}

function handleEdit(row) {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    address: row.address,
    remark: row.remark || ''
  })
  modalVisible.value = true
}

async function handleSubmit(e) {
  try {
    await formRef.value.validate()
  } catch (err) {
    return false
  }

  try {
    const payload = {
      name: formData.name,
      contact: formData.contact,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      remark: formData.remark
    }
    if (isEdit.value) {
      await updateSupplier(formData.id, payload)
    } else {
      await createSupplier(payload)
    }
    message.success(isEdit.value ? '编辑成功' : '新增成功')
    modalVisible.value = false
    fetchData()
  } catch (e) {
    console.error('submit supplier error:', e)
  }
  return false
}

function handleDelete(row) {
  dialog.warning({
    title: '删除确认',
    content: `确定要删除供应商「${row.name}」吗？此操作不可恢复。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteSupplier(row.id)
        message.success('删除成功')
        fetchData()
      } catch (e) {
        console.error('delete supplier error:', e)
      }
    }
  })
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
</style>
