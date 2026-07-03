import { ref } from 'vue'
import { getPrompt, parseResponse, validateResult } from '@/config/prompts.js'

export function useApi() {
  const loading = ref(false)
  const error = ref(null)
  const result = ref(null)

  /**
   * base64 转 Blob
   */
  function base64ToBlob(dataUrl) {
    const parts = dataUrl.split(',')
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bytes = atob(parts[1])
    const ab = new ArrayBuffer(bytes.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < bytes.length; i++) {
      ia[i] = bytes.charCodeAt(i)
    }
    return new Blob([ab], { type: mime })
  }

  /**
   * 1) 上传图片到 DeepSeek Files API
   * 2) 用返回的 file_id 调用 chat API 进行分析
   */
  async function analyzeImage(imageBase64, settings, onProgress) {
    loading.value = true
    error.value = null
    result.value = null

    try {
      if (!settings.apiKey) {
        throw new Error('请先填写 API Key')
      }

      const baseUrl = settings.apiBase || 'https://api.deepseek.com'
      const model = settings.model || 'deepseek-chat'

      // ----- 第一步：上传图片 -----
      onProgress?.('正在上传图片...')

      const blob = base64ToBlob(imageBase64)
      const formData = new FormData()
      formData.append('file', blob, 'question.jpg')
      formData.append('purpose', 'vision')

      const uploadRes = await fetch(`${baseUrl}/v1/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: formData
      })

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '未知错误')
        throw new Error(`图片上传失败 (${uploadRes.status}): ${errText}`)
      }

      const uploadData = await uploadRes.json()
      const fileId = uploadData.id
      if (!fileId) {
        throw new Error('上传成功但未获取到 file_id')
      }

      // ----- 第二步：调用 Chat API 分析 -----
      onProgress?.('正在分析题目...')

      const prompt = getPrompt()

      const body = {
        model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: `请分析这张题目图片，按要求的 JSON 格式返回结果。\n![image](file://${fileId})`
          }
        ],
        temperature: 0.1,
        max_tokens: 4096,
        stream: false
      }

      const chatRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify(body)
      })

      if (!chatRes.ok) {
        const errText = await chatRes.text().catch(() => '未知错误')
        throw new Error(`API 请求失败 (${chatRes.status}): ${errText}`)
      }

      onProgress?.('正在解析返回结果...')

      const data = await chatRes.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('API 返回内容为空')
      }

      // ----- 第三步：解析 JSON -----
      let parsed
      try {
        parsed = parseResponse(content)
      } catch (e) {
        console.warn('JSON 解析失败，尝试修复...', e)
        parsed = {
          originalText: content,
          subject: '其他',
          subSubject: '',
          questionType: '其他',
          solution: {
            thinking: '解析返回格式失败，请查看原始返回内容',
            steps: [],
            answer: content
          }
        }
      }

      // 校验必要字段
      const validation = validateResult(parsed)
      if (!validation.valid) {
        console.warn('格式校验警告:', validation.errors.join(', '))
      }

      if (!parsed.originalText) parsed.originalText = '(未能识别出题目文字)'
      if (!parsed.subject) parsed.subject = '其他'
      if (!parsed.questionType) parsed.questionType = '其他'
      if (!parsed.solution) {
        parsed.solution = { thinking: '', steps: [], answer: '' }
      }
      if (!parsed.solution.thinking) parsed.solution.thinking = ''
      if (!parsed.solution.steps || !Array.isArray(parsed.solution.steps)) {
        parsed.solution.steps = []
      }
      if (!parsed.solution.answer) parsed.solution.answer = ''

      result.value = parsed
      return parsed

    } catch (e) {
      error.value = e.message || '未知错误'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, result, analyzeImage }
}
