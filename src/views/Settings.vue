<template>
  <div class="page">
    <h2 class="page-title">⚙️ 设置</h2>

    <!-- API 设置 -->
    <div class="section-title mt-3">API 配置</div>
    <div class="card-glass">

      <!-- DeepSeek -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">② DeepSeek API Key</span>
          <span class="label-desc">用于题目分析（思路/步骤/答案）</span>
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

      <div class="divider"></div>

      <!-- 百炼 -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">① 阿里百炼 API Key</span>
          <span class="label-desc">用于图片→文字 OCR，支持数学公式</span>
        </div>
        <div class="setting-input">
          <input
            v-model="localBailianKey"
            :type="showBailian ? 'text' : 'password'"
            class="input"
            placeholder="sk-xxxxxxxxxxxxxxxx"
            @input="onBailianKeyChange"
          />
          <button class="btn btn-sm btn-outline toggle-btn" @click="showBailian = !showBailian">
            {{ showBailian ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">百炼视觉模型</span>
        </div>
        <select v-model="localBailianModel" class="input" @change="onBailianModelChange">
          <option value="qwen3-vl-plus">qwen3-vl-plus（推荐）</option>
          <option value="qwen2.5-vl-72b">qwen2.5-vl-72b（更强）</option>
          <option value="qwen-vl-max">qwen-vl-max（兼容）</option>
          <option value="qwen-vl-plus">qwen-vl-plus</option>
        </select>
      </div>

      <div class="divider"></div>

      <!-- DeepSeek 模型 -->
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">DeepSeek 模型</span>
        </div>
        <input
          v-model="localModel"
          class="input"
          placeholder="deepseek-v4-flash"
          @input="onModelChange"
        />
      </div>

      <div class="text-sm text-muted mt-2">
        流程：百炼多模态OCR提取文字+公式 → DeepSeek分析题目
      </div>

      <button v-if="localApiKey || localBailianKey" class="btn btn-sm btn-outline mt-2" @click="clearKeys">
        清除所有 Key
      </button>
    </div>

    <!-- 当前流程 -->
    <div class="section-title mt-3">当前流程</div>
    <div class="card-glass">
      <div class="setting-item">
        <div class="setting-label">
          <span class="label-text">🖼️ 百炼多模态OCR → 🤖 DeepSeek分析</span>
          <span class="label-desc">百炼提取文字+公式 → DeepSeek给出解题思路和答案</span>
        </div>
      </div>
      <div class="text-sm text-muted mt-2">
        费用：百炼约¥0.02/题 + DeepSeek约¥0.0005/题，合计不到3分钱
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
const localModel = ref('')
const showKey = ref(false)
const localBailianKey = ref('')
const localBailianModel = ref('qwen3-vl-plus')
const showBailian = ref(false)
const saved = ref(false)
const count = ref(0)

onMounted(() => {
  localApiKey.value = settings.value.apiKey
  localModel.value = settings.value.model || 'deepseek-v4-flash'
  localBailianKey.value = settings.value.bailianApiKey || ''
  localBailianModel.value = settings.value.bailianModel || 'qwen3-vl-plus'
  loadCount()
})

function onKeyChange() {
  update('apiKey', localApiKey.value)
  showSaveTip()
}
function onModelChange() {
  update('model', localModel.value)
  showSaveTip()
}
function onBailianKeyChange() {
  update('bailianApiKey', localBailianKey.value)
  showSaveTip()
}
function onBailianModelChange() {
  update('bailianModel', localBailianModel.value)
  showSaveTip()
}
function clearKeys() {
  localApiKey.value = ''
  localBailianKey.value = ''
  settings.value = { ...settings.value, apiKey: '', bailianApiKey: '' }
  save()
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
