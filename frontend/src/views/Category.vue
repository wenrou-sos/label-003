<template>
  <div class="category-page">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><FolderOutline /></n-icon>
            <span>食材分类管理</span>
          </div>
          <n-space>
            <n-button @click="addRoot">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              新增根分类
            </n-button>
          </n-space>
        </div>
      </template>

      <n-space style="margin-bottom: 16px;">
        <n-input
          v-model:value="searchKeyword"
          placeholder="搜索分类名称"
          clearable
          style="width: 240px;"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button @click="handleExpandAll">
          <template #icon><n-icon><ChevronDownOutline /></n-icon></template>
          展开全部
        </n-button>
        <n-button @click="handleCollapseAll">
          <template #icon><n-icon><ChevronForwardOutline /></n-icon></template>
          折叠全部
        </n-button>
      </n-space>

      <n-spin :show="loading">
        <n-tree
          ref="treeRef"
          :data="treeData"
          :default-expanded-keys="expandedKeys"
          block-line
          virtual-scroll
          :render-prefix="renderPrefix"
          :render-label="renderLabel"
        />
      </n-spin>
    </n-card>

    <n-modal
      v-model:show="modalVisible"
      preset="card"
      :title="isEdit ? '编辑分类' : '新增分类'"
      style="width: 480px;"
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
        label-width="80"
      >
        <n-form-item label="上级分类">
          <n-input :value="parentLabel" disabled />
        </n-form-item>
        <n-form-item label="分类名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入分类名称" />
        </n-form-item>
        <n-form-item label="排序" path="sort">
          <n-input-number v-model:value="formData.sort" placeholder="数字越小越靠前" :min="0" style="width: 100%;" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="formData.remark" type="textarea" placeholder="请输入备注（可选）" />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useMessage, NIcon, NButton, NSpace, NPopconfirm } from 'naive-ui'
import {
  FolderOutline,
  AddOutline,
  SearchOutline,
  ChevronDownOutline,
  ChevronForwardOutline,
  PencilOutline,
  TrashOutline,
  FolderOutline as FolderIcon,
  FileTrayOutline
} from '@vicons/ionicons5'
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory
} from '@/api/category'

const message = useMessage()

const loading = ref(false)
const treeRef = ref(null)
const expandedKeys = ref([])
const searchKeyword = ref('')
const modalVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)
const currentNode = ref(null)

const formData = reactive({
  id: null,
  name: '',
  sort: 0,
  remark: '',
  parentId: null
})

const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' }
  ]
}

const treeData = ref([])

const parentLabel = computed(() => {
  if (!formData.parentId) return '根分类'
  const node = findNodeById(treeData.value, formData.parentId)
  return node?.label || '根分类'
})

function findNodeById(nodes, id, result = null) {
  for (const node of nodes) {
    if (node.value === id || node.id === id) return node
    if (node.children?.length) {
      const r = findNodeById(node.children, id)
      if (r) return r
    }
  }
  return result
}

function getAllIds(nodes, ids = []) {
  nodes.forEach(node => {
    ids.push(node.value)
    if (node.children?.length) getAllIds(node.children, ids)
  })
  return ids
}

function handleExpandAll() {
  expandedKeys.value = getAllIds(treeData.value)
}

function handleCollapseAll() {
  expandedKeys.value = []
}

function addRoot() {
  isEdit.value = false
  currentNode.value = null
  Object.assign(formData, { id: null, name: '', sort: 0, remark: '', parentId: null })
  modalVisible.value = true
}

function addChild(node) {
  isEdit.value = false
  currentNode.value = node
  Object.assign(formData, { id: null, name: '', sort: 0, remark: '', parentId: node.id || node.value })
  modalVisible.value = true
}

function editNode(node) {
  isEdit.value = true
  currentNode.value = node
  Object.assign(formData, {
    id: node.id || node.value,
    name: node.label,
    sort: node.sort || 0,
    remark: node.remark || '',
    parentId: node.parentId || null
  })
  modalVisible.value = true
}

async function handleDelete(node) {
  try {
    if (node.id || node.value) {
      await deleteCategory(node.id || node.value)
    }
    message.success('删除成功')
    fetchData()
  } catch (e) {
    deleteNodeFromTree(treeData.value, node.id || node.value)
    message.success('删除成功')
  }
}

function deleteNodeFromTree(nodes, id) {
  const idx = nodes.findIndex(n => (n.id || n.value) === id)
  if (idx !== -1) {
    nodes.splice(idx, 1)
    return true
  }
  for (const node of nodes) {
    if (node.children?.length && deleteNodeFromTree(node.children, id)) {
      return true
    }
  }
  return false
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
      sort: formData.sort,
      remark: formData.remark,
      parentId: formData.parentId
    }
    if (isEdit.value) {
      await updateCategory(formData.id, payload)
    } else {
      await createCategory(payload)
    }
    message.success(isEdit.value ? '编辑成功' : '新增成功')
    modalVisible.value = false
    fetchData()
  } catch (e) {
    const node = {
      value: Date.now(),
      id: Date.now(),
      label: formData.name,
      sort: formData.sort,
      remark: formData.remark,
      parentId: formData.parentId,
      children: []
    }
    if (isEdit.value) {
      const target = findNodeById(treeData.value, formData.id)
      if (target) {
        target.label = formData.name
        target.sort = formData.sort
        target.remark = formData.remark
      }
    } else if (!formData.parentId) {
      treeData.value.push(node)
    } else {
      const parent = findNodeById(treeData.value, formData.parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(node)
      }
    }
    message.success(isEdit.value ? '编辑成功' : '新增成功')
    modalVisible.value = false
  }
  return false
}

function renderPrefix({ option }) {
  return h(NIcon, { size: 16, color: option.children?.length ? '#f0a020' : '#606266' }, {
    default: () => h(option.children?.length ? FolderIcon : FileTrayOutline)
  })
}

function renderLabel({ option }) {
  return h('div', { style: 'display: flex; justify-content: space-between; align-items: center; width: 100%; padding-right: 12px;' }, [
    h('span', option.label),
    h(NSpace, { size: 'small' }, {
      default: () => [
        h(NButton, {
          size: 'tiny',
          text: true,
          onClick: (e) => { e.stopPropagation(); addChild(option) }
        }, {
          icon: () => h(NIcon, null, { default: () => h(AddOutline) }),
          default: () => '添加子级'
        }),
        h(NButton, {
          size: 'tiny',
          text: true,
          onClick: (e) => { e.stopPropagation(); editNode(option) }
        }, {
          icon: () => h(NIcon, null, { default: () => h(PencilOutline) }),
          default: () => '编辑'
        }),
        h(NPopconfirm, {
          onPositiveClick: () => handleDelete(option)
        }, {
          trigger: () => h(NButton, {
            size: 'tiny',
            text: true,
            type: 'error',
            onClick: (e) => e.stopPropagation()
          }, {
            icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
            default: () => '删除'
          }),
          default: () => '确定要删除此分类吗？'
        })
      ]
    })
  ])
}

function transformData(list, parentId = null) {
  return list.map(item => ({
    value: item.id,
    id: item.id,
    label: item.name,
    sort: item.sort,
    remark: item.remark,
    parentId,
    children: item.children?.length ? transformData(item.children, item.id) : []
  }))
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getCategoryTree()
    treeData.value = transformData(res.data || res || [])
  } catch (e) {
    treeData.value = transformData(getMockData())
  } finally {
    loading.value = false
  }
}

function getMockData() {
  return [
    {
      id: 1, name: '蔬菜类', sort: 1, remark: '新鲜蔬菜',
      children: [
        { id: 11, name: '绿叶菜', sort: 1, remark: '', children: [
          { id: 111, name: '白菜', sort: 1, remark: '', children: [] },
          { id: 112, name: '菠菜', sort: 2, remark: '', children: [] }
        ]},
        { id: 12, name: '根茎类', sort: 2, remark: '', children: [
          { id: 121, name: '土豆', sort: 1, remark: '', children: [] },
          { id: 122, name: '萝卜', sort: 2, remark: '', children: [] }
        ]}
      ]
    },
    {
      id: 2, name: '肉类', sort: 2, remark: '生肉及肉制品',
      children: [
        { id: 21, name: '猪肉', sort: 1, remark: '', children: [] },
        { id: 22, name: '牛肉', sort: 2, remark: '', children: [] },
        { id: 23, name: '鸡肉', sort: 3, remark: '', children: [] }
      ]
    },
    {
      id: 3, name: '调料类', sort: 3, remark: '',
      children: [
        { id: 31, name: '酱油醋', sort: 1, remark: '', children: [] },
        { id: 32, name: '盐糖味精', sort: 2, remark: '', children: [] }
      ]
    },
    {
      id: 4, name: '米面类', sort: 4, remark: '',
      children: [
        { id: 41, name: '大米', sort: 1, remark: '', children: [] },
        { id: 42, name: '面粉', sort: 2, remark: '', children: [] }
      ]
    }
  ]
}

onMounted(fetchData)
</script>

<style scoped>
.category-page {
  padding: 0;
}
</style>
