<template>
  <div class="page">
    <h2 class="page-title">⚙️ 设置</h2>

    <!-- API 设置 -->
    <div class="section-title mt-3">API 配置</div>
    <div class="card-glass">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">DeepSeek API Key</span>
          <span class="label-desc">手动填写，仅存在本地浏览器</span>
        </div>
        <div class="setting-input">
          <input
            v-model="localApiKey"
            :type="showKey ? 'text' : 'password'"
            class="input"
            placeholder="sk-xxxxxxxxxxxxxxxx"
            @input="onKeyChange"
          />
          <button class="btn btn-sm btn-outline toggle-btn" @click="showKey = !showKey">
            {{ showKey ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">API 地址</span>
          <span class="label-desc">默认 https://api.deepseek.com</span>
        </div>
        <input
          v-model="localApiBase"
          class="input"
          placeholder="https://api.deepseek.com"
          @input="onBaseChange"
        />
      </div>

      <button v-if="localApiKey" class="btn btn-sm btn-outline mt-2" @click="clearKey">
        清除 API Key
      </button>
    </div>

    <!-- 模型信息 -->
    <div class="section-title mt-3">模型信息</div>
    <div class="card-glass">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">当前模型</span>
        </div>
        <span class="tag tag-primary">DeepSeek Flash (deepseek-chat)</span>
      </div>
      <div class="text-sm text-muted mt-2">
        DeepSeek Flash 支持图片识别和分析，价格约 ¥0.5/百万 token
      </div>
    </div>

    <!-- 数据管理 -->
    <div class="section-title mt-3">数据管理</div>
    <div class="card-glass">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">当前数据量</span>
        </div>
        <span class="tag tag-success">{{ count }} 条错题</span>
      </div>

      <div class="setting-actions">
        <button class="btn btn-outline btn-sm" @click="exportData">
          📥 导出数据
        </button>
        <label class="btn btn-outline btn-sm" style="cursor:pointer">
          📤 导入数据
          <input type="file" accept=".json" style="display:none" @change="importData" />
        </label>
        <button class="btn btn-sm btn-danger" @click="clearAllData">
          🗑️ 清空所有
        </button>
      </div>
    </div>

    <!-- 关于 -->
    <div class="section-title mt-3">关于</div>
    <div class="card-glass text-center" style="padding:20px">
      <p class="font-bold" style="font-size:18px">FixMate</p>
      <p class="text-sm text-muted mt-2">错题整理与学习助手</p>
      <p class="text-xs text-muted mt-2">v1.0.0 · 纯前端应用 · 数据仅存本地</p>
    </div>

    <!-- 成功提示 -->
    <div v-if="saved" class="toast-container">
      <div class="toast">✅ 设置已保存</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettings } from '@/composables/useSettings.js'
import { useDb } from '@/composables/useDb.js'
import { showToast } from '@/stores/appState.js'

const { settings, update, clear } = useSettings()
const { exportAll, importAll, clearAll, getCount } = useDb()

const localApiKey = ref('')
const localApiBase = ref('')
const showKey = ref(false)
const saved = ref(false)
const count = ref(0)

onMounted(() => {
  localApiKey.value = settings.value.apiKey
  localApiBase.value = settings.value.apiBase
  loadCount()
})

function onKeyChange() {
  update('apiKey', localApiKey.value)
  showSaveTip()
}

function onBaseChange() {
  update('apiBase', localApiBase.value)
  showSaveTip()
}

function clearKey() {
  localApiKey.value = ''
  clear()
  showSaveTip()
}

function showSaveTip() {
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function loadCount() {
  try {
    count.value = await getCount()
  } catch (e) {
    count.value = 0
  }
}

async function exportData() {
  try {
    const data = await exportAll()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FixMate-备份-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('导出成功！')
  } catch (e) {
    showToast('导出失败: ' + e.message)
  }
}

async function importData(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const count = await importAll(text)
    showToast(`导入成功！共 ${count} 条记录`)
    loadCount()
  } catch (e) {
    showToast('导入失败: ' + e.message)
  }
  e.target.value = ''
}

async function clearAllData() {
  if (!confirm('确定要清空所有错题数据吗？此操作不可恢复！')) return
  try {
    await clearAll()
    showToast('已清空所有数据')
    loadCount()
  } catch (e) {
    showToast('清空失败')
  }
}
</script>

<style scoped>
.page-title {
  font-size: 22px;
  font-weight: 800;
  padding-top: 12px;
}

.setting-item {
  margin-bottom: 14px;
}
.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  margin-bottom: 6px;
}
.label-text {
  font-size: 15px;
  font-weight: 600;
  display: block;
}
.label-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.setting-input {
  display: flex;
  gap: 8px;
}
.setting-input .input {
  flex: 1;
}

.toggle-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.setting-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}
</style>
