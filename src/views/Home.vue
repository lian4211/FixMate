<template>
  <div class="page">
    <!-- Header -->
    <div class="home-header">
      <h1 class="home-title">FixMate</h1>
      <p class="home-subtitle">拍照识别错题 · AI 智能解析</p>
    </div>

    <!-- API Key 提示 -->
    <div v-if="!hasApiKey()" class="card-glass api-key-warning" @click="$router.push('/settings')">
      <span class="warning-icon">⚠️</span>
      <span class="warning-text">请先设置 DeepSeek API Key</span>
      <span class="warning-arrow">→</span>
    </div>

    <!-- 上传区域 -->
    <div class="upload-area" :class="{ 'has-image': imageDataUrl }" @click="triggerUpload">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="file-input"
        @change="onFileSelect"
      />
      <template v-if="imageDataUrl">
        <img :src="imageDataUrl" alt="错题图片" class="preview-image" />
        <div class="upload-overlay">
          <span class="re-take">重新拍照</span>
        </div>
      </template>
      <template v-else>
        <div class="upload-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="upload-icon">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <p class="upload-text">点击拍照或选择图片</p>
          <p class="upload-hint">支持 JPG / PNG 格式</p>
        </div>
      </template>
    </div>

    <!-- 编辑按钮（图片上传后显示） -->
    <div v-if="imageDataUrl && !result" class="edit-bar">
      <button class="btn btn-outline btn-block" @click="showEditor = true">
        ✂️ 裁剪 / 旋转
      </button>
    </div>

    <!-- 操作按钮 -->
    <div v-if="imageDataUrl && !result" class="action-bar">
      <button
        class="btn btn-primary btn-block"
        :disabled="loading || !hasApiKey()"
        @click="startAnalysis"
      >
        <span v-if="loading" class="spinner" style="width:18px;height:18px;border-width:2px"></span>
        <span v-else>🤖 开始识别</span>
      </button>
    </div>

    <!-- 进度提示 -->
    <div v-if="loading && progressText" class="progress-hint card-glass">
      <span class="spinner spinner-lg" style="margin:0 auto 12px"></span>
      <p class="text-center">{{ progressText }}</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="card error-card">
      <div class="error-icon">❌</div>
      <p class="error-text">{{ error }}</p>
      <button class="btn btn-outline btn-sm mt-2" @click="error = null">关闭</button>
    </div>

    <!-- 结果展示 -->
    <div v-if="result && !loading" class="result-section">
      <div class="result-header">
        <h2 class="section-title">📋 分析结果</h2>
      </div>

      <!-- 题目原文 -->
      <div class="card-glass">
        <div class="label-tag">题目原文</div>
        <p class="original-text">{{ result.originalText }}</p>
      </div>

      <!-- 分类信息 -->
      <div class="card-glass">
        <div class="label-tag">分类信息</div>
        <div class="tag-row">
          <span class="tag tag-primary">{{ result.subject }}{{ result.subSubject ? ' - ' + result.subSubject : '' }}</span>
          <span class="tag tag-success">{{ result.questionType }}</span>
        </div>
      </div>

      <!-- 解题思路 -->
      <div v-if="result.solution.thinking" class="card-glass">
        <div class="label-tag">💡 解题思路</div>
        <p class="thinking-text">{{ result.solution.thinking }}</p>
      </div>

      <!-- 答题流程 -->
      <div v-if="result.solution.steps && result.solution.steps.length" class="card-glass">
        <div class="label-tag">📝 答题流程</div>
        <div class="steps-list">
          <div
            v-for="(step, i) in result.solution.steps"
            :key="i"
            class="step-item"
          >
            <span class="step-num">{{ i + 1 }}</span>
            <span class="step-text">{{ step }}</span>
          </div>
        </div>
      </div>

      <!-- 最终答案 -->
      <div v-if="result.solution.answer" class="card-glass answer-card">
        <div class="label-tag">✅ 最终答案</div>
        <p class="answer-text">{{ result.solution.answer }}</p>
      </div>

      <!-- 存入错题本 -->
      <button class="btn btn-primary btn-block mt-3" @click="saveQuestion">
        确认存入错题本
      </button>

      <!-- 重新识别 -->
      <button class="btn btn-outline btn-block mt-2" @click="reset">
        重新识别
      </button>
    </div>

    <!-- 图片编辑器 -->
    <ImageEditor
      v-if="showEditor"
      :image-src="imageDataUrl"
      @confirm="onEditorConfirm"
      @cancel="showEditor = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useApi } from '@/composables/useApi.js'
import { useImage } from '@/composables/useImage.js'
import { useDb } from '@/composables/useDb.js'
import { useSettings } from '@/composables/useSettings.js'
import { showToast } from '@/stores/appState.js'
import ImageEditor from '@/components/upload/ImageEditor.vue'

const fileInput = ref(null)
const imageDataUrl = ref(null)
const imageFile = ref(null)
const progressText = ref('')
const showEditor = ref(false)

const { loading, error, result, analyzeImage } = useApi()
const { compress } = useImage()
const { addQuestion } = useDb()
const { hasApiKey, settings } = useSettings()

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const compressed = await compress(file)
    imageDataUrl.value = compressed.dataUrl
    imageFile.value = compressed.file
    error.value = null
    result.value = null
    showEditor.value = false
  } catch (err) {
    showToast('图片处理失败: ' + err.message)
  }
}

function onEditorConfirm(dataUrl) {
  imageDataUrl.value = dataUrl
  showEditor.value = false
  showToast('图片已编辑')
}

async function startAnalysis() {
  if (!imageDataUrl.value || !hasApiKey()) return

  progressText.value = '正在压缩图片...'
  await new Promise(r => setTimeout(r, 100))

  try {
    await analyzeImage(imageDataUrl.value, settings.value, (msg) => {
      progressText.value = msg
    })
    progressText.value = ''
    showToast('分析完成！')
  } catch (err) {
    progressText.value = ''
    showToast(err.message || '分析失败')
  }
}

async function saveQuestion() {
  if (!result.value) return
  try {
    await addQuestion({
      title: result.value.originalText?.slice(0, 50) || '未知题目',
      imageBase64: imageDataUrl.value,
      originalText: result.value.originalText,
      subject: result.value.subject,
      subSubject: result.value.subSubject || '',
      questionType: result.value.questionType,
      solution: result.value.solution
    })
    showToast('已存入错题本！')
    reset()
  } catch (err) {
    showToast('保存失败: ' + err.message)
  }
}

function reset() {
  imageDataUrl.value = null
  imageFile.value = null
  result.value = null
  error.value = null
  progressText.value = ''
  // 清空文件输入
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.home-header {
  text-align: center;
  padding: 20px 0 16px;
}

.home-title {
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.home-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* API Key 提示 */
.api-key-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 12px 16px;
}
.warning-icon { font-size: 18px; }
.warning-text { flex: 1; font-size: 14px; color: var(--warning); font-weight: 500; }
.warning-arrow { color: var(--text-muted); font-size: 16px; }

/* 上传区域 */
.upload-area {
  position: relative;
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
}
.upload-area:active {
  border-color: var(--primary);
  background: var(--primary-bg);
}
.upload-area.has-image {
  border-style: solid;
  border-color: transparent;
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.upload-icon { color: var(--text-muted); margin-bottom: 12px; }

.upload-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
}

.upload-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

.preview-image {
  width: 100%;
  display: block;
  max-height: 400px;
  object-fit: contain;
}

.upload-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.4));
  text-align: center;
}

.re-take {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
}

/* 编辑按钮 */
.edit-bar {
  margin-top: 10px;
}

/* 操作按钮区 */
.action-bar {
  margin-top: 10px;
}

/* 进度提示 */
.progress-hint {
  margin-top: 12px;
  padding: 20px;
  text-align: center;
}

/* 错误提示 */
.error-card {
  margin-top: 12px;
  text-align: center;
  padding: 20px;
  border: 1px solid rgba(239,68,68,0.2);
}
.error-icon { font-size: 32px; margin-bottom: 8px; }
.error-text { color: var(--danger); font-size: 14px; }

/* 结果区域 */
.result-section {
  margin-top: 8px;
}

.label-tag {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.original-text {
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.tag-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.thinking-text {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.step-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.step-text {
  font-size: 15px;
  line-height: 1.6;
  padding-top: 2px;
}

.answer-card {
  border-left: 3px solid var(--success);
}

.answer-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
