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

    <!-- 操作按钮：第一步 OCR -->
    <div v-if="imageDataUrl && !result && !ocrText" class="action-bar">
      <button
        class="btn btn-primary btn-block"
        :disabled="loading || !hasApiKey()"
        @click="startOcr"
      >
        <span v-if="loading" class="spinner" style="width:18px;height:18px;border-width:2px"></span>
        <span v-else>{{ hasBailianKey() ? '🖼️ 开始识别' : '📝 手动输入' }}</span>
      </button>
    </div>

    <!-- 进度提示 -->
    <div v-if="loading && progressText" class="progress-hint card-glass">
      <span class="spinner spinner-lg" style="margin:0 auto 12px"></span>
      <p class="text-center">{{ progressText }}</p>
    </div>

    <!-- OCR 结果编辑 -->
    <div v-if="ocrText && !result && !loading" class="ocr-edit-section">
      <div class="card-glass">
        <div class="label-tag">✏️ OCR 识别结果（可修改）</div>
        <textarea
          v-model="editableOcrText"
          class="input ocr-textarea"
          rows="6"
          placeholder="识别出的题目文字..."
        ></textarea>
        <p class="text-xs text-muted mt-2">如果识别不准确，请手动修正后再提交 AI 分析</p>
      </div>
      <button
        class="btn btn-primary btn-block mt-2"
        :disabled="!editableOcrText.trim()"
        @click="sendToAi"
      >
        🤖 AI 分析
      </button>
      <button class="btn btn-outline btn-block mt-2" @click="reset">
        🔄 重新拍照
      </button>
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
        <div class="label-tag">📄 题目原文</div>
        <MathText class="math-content" :text="result.originalText" />
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
        <MathText class="math-content" :text="result.solution.thinking" />
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
            <MathText class="step-text" :text="step" />
          </div>
        </div>
      </div>

      <!-- 最终答案 -->
      <div v-if="result.solution.answer" class="card-glass answer-card">
        <div class="label-tag">✅ 最终答案</div>
        <MathText class="math-content answer-text" :text="result.solution.answer" />
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
import MathText from '@/components/result/MathText.vue'

const fileInput = ref(null)
const imageDataUrl = ref(null)
const imageFile = ref(null)
const progressText = ref('')
const showEditor = ref(false)
const editableOcrText = ref('')

const { loading, error, result, ocrText, analyzeImage } = useApi()
const { compress } = useImage()
const { addQuestion } = useDb()
const { hasApiKey, hasBailianKey, settings } = useSettings()

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

async function startOcr() {
  if (!imageDataUrl.value || !hasApiKey()) return

  editableOcrText.value = ''
  result.value = null

  // 判断是否有百炼 Key
  if (hasBailianKey()) {
    // === 双API流程：百炼OCR → DeepSeek分析 ===
    try {
      loading.value = true
      error.value = null

      // Step 1: 百炼多模态OCR
      progressText.value = '🖼️ 百炼正在提取文字和公式...'

      const bailianResp = await fetch(
        `${settings.value.bailianApiBase || 'https://dashscope.aliyuncs.com'}/compatible-mode/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.value.bailianApiKey}`
          },
          body: JSON.stringify({
            model: settings.value.bailianModel || 'qwen3-vl-plus',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: '请精确提取图片中的文字和数学公式。数学公式用LaTeX格式输出（如 $ax^2+bx+c=0$），保留所有题目条件和选项。不要分析题目，只提取原文。' },
                  { type: 'image_url', image_url: { url: imageDataUrl.value } }
                ]
              }
            ],
            temperature: 0.1,
            max_tokens: 4096
          })
        }
      )

      if (!bailianResp.ok) {
        const errText = await bailianResp.text().catch(() => '')
        throw new Error(`百炼OCR失败 (${bailianResp.status}): ${errText}`)
      }

      const bailianData = await bailianResp.json()
      const bailianContent = bailianData.choices?.[0]?.message?.content
      if (!bailianContent) throw new Error('百炼返回内容为空')

      // 保存OCR结果供显示
      ocrText.value = bailianContent
      progressText.value = '✅ 文字提取完成，正在分析题目...'

      // Step 2: DeepSeek 分析
      const dsPrompt = (await import('@/config/prompts.js')).getPrompt()
      const dsBody = {
        model: settings.value.model || 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: dsPrompt },
          { role: 'user', content: `以下是从图片中提取的题目文字（包含LaTeX数学公式），请分析并按要求返回JSON格式的结果，注意保持LaTeX公式原样输出：\n\n${bailianContent}` }
        ],
        temperature: 0.1,
        max_tokens: 4096
      }

      const dsResp = await fetch(`${settings.value.apiBase || 'https://api.deepseek.com'}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.value.apiKey}`
        },
        body: JSON.stringify(dsBody)
      })

      if (!dsResp.ok) {
        const errText = await dsResp.text().catch(() => '')
        throw new Error(`DeepSeek分析失败 (${dsResp.status}): ${errText}`)
      }

      progressText.value = '正在解析结果...'

      const dsData = await dsResp.json()
      const dsContent = dsData.choices?.[0]?.message?.content
      if (!dsContent) throw new Error('DeepSeek返回内容为空')

      const { parseResponse } = await import('@/config/prompts.js')
      let parsed
      try {
        parsed = parseResponse(dsContent)
      } catch (e) {
        parsed = {
          originalText: bailianContent,
          subject: '其他', subSubject: '', questionType: '其他',
          solution: { thinking: '', steps: [], answer: dsContent }
        }
      }

      if (!parsed.originalText || parsed.originalText.length < 3) parsed.originalText = bailianContent
      if (!parsed.subject) parsed.subject = '其他'
      if (!parsed.questionType) parsed.questionType = '其他'
      if (!parsed.solution) parsed.solution = { thinking: '', steps: [], answer: '' }
      if (!parsed.solution.thinking) parsed.solution.thinking = ''
      if (!parsed.solution.steps || !Array.isArray(parsed.solution.steps)) parsed.solution.steps = []
      if (!parsed.solution.answer) parsed.solution.answer = ''

      result.value = parsed
      progressText.value = ''
      showToast('分析完成！')
    } catch (err) {
      progressText.value = ''
      showToast(err.message || '分析失败')
    } finally {
      loading.value = false
    }
    return
  }

  // === OCR 模式（DeepSeek 纯文本模型） ===
  try {
    // 调用 analyzeImage 但只做 OCR 步骤
    loading.value = true
    error.value = null
    progressText.value = '正在识别图片中的文字...'

    // 使用 Tesseract.js 进行 OCR
    const Tesseract = (await import('tesseract.js')).default
    const ocrResult = await Tesseract.recognize(
      imageDataUrl.value,
      'chi_sim+eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100)
            progressText.value = `OCR 识别中... ${pct}%`
          }
        }
      }
    )

    const text = ocrResult.data.text.trim()
    ocrText.value = text
    editableOcrText.value = text || '(未识别出文字，请手动输入题目)'
    progressText.value = ''
    showToast('文字扫描完成，请确认后提交 AI 分析')
  } catch (err) {
    showToast('OCR 识别失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

async function sendToAi() {
  if (!editableOcrText.value.trim() || !hasApiKey()) return

  try {
    loading.value = true
    error.value = null
    progressText.value = '正在分析题目...'

    // 直接调用 DeepSeek API 分析文本
    const baseUrl = settings.value.apiBase || 'https://api.deepseek.com'
    const model = settings.value.model || 'deepseek-v4-flash'
    const prompt = (await import('@/config/prompts.js')).getPrompt()

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.value.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `以下是从图片中识别出的题目文字，请分析并按要求返回 JSON 格式的结果：\n\n${editableOcrText.value}` }
        ],
        temperature: 0.1,
        max_tokens: 4096
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '未知错误')
      throw new Error(`API 请求失败 (${response.status}): ${errText}`)
    }

    progressText.value = '正在解析返回结果...'

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('API 返回内容为空')

    const { parseResponse, validateResult } = await import('@/config/prompts.js')
    let parsed
    try {
      parsed = parseResponse(content)
    } catch (e) {
      parsed = {
        originalText: editableOcrText.value,
        subject: '其他', subSubject: '', questionType: '其他',
        solution: { thinking: '解析返回格式失败', steps: [], answer: content }
      }
    }

    if (!parsed.originalText || parsed.originalText.length < 3) {
      parsed.originalText = editableOcrText.value
    }
    if (!parsed.subject) parsed.subject = '其他'
    if (!parsed.questionType) parsed.questionType = '其他'
    if (!parsed.solution) parsed.solution = { thinking: '', steps: [], answer: '' }
    if (!parsed.solution.thinking) parsed.solution.thinking = ''
    if (!parsed.solution.steps || !Array.isArray(parsed.solution.steps)) parsed.solution.steps = []
    if (!parsed.solution.answer) parsed.solution.answer = ''

    result.value = parsed
    progressText.value = ''
    showToast('分析完成！')
  } catch (err) {
    progressText.value = ''
    showToast(err.message || '分析失败')
  } finally {
    loading.value = false
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
  ocrText.value = ''
  editableOcrText.value = ''
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

/* OCR 编辑区 */
.ocr-textarea {
  min-height: 120px;
  resize: vertical;
  font-size: 15px;
  line-height: 1.7;
  font-family: inherit;
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
.math-content {
  line-height: 1.8;
  font-size: 15px;
}
</style>
