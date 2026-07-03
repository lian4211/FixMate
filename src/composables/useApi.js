import { ref } from 'vue'
import { getPrompt, parseResponse, validateResult } from '@/config/prompts.js'

export function useApi() {
  const loading = ref(false)
  const error = ref(null)
  const result = ref(null)

  /**
   * 调用 DeepSeek API 分析错题图片
   * @param {string} imageBase64 - 图片 base64 数据
   * @param {Object} settings - { apiKey, model, apiBase }
   * @param {Function} onProgress - 进度回调
   */
  async function analyzeImage(imageBase64, settings, onProgress) {
    loading.value = true
    error.value = null
    result.value = null

    try {
      if (!settings.apiKey) {
        throw new Error('请先填写 API Key')
      }

      const prompt = getPrompt()

      // 构建请求体
      const body = {
        model: settings.model || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请分析这张题目图片，按要求的 JSON 格式返回结果。'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,  // 低温度保证格式稳定
        max_tokens: 4096,
        stream: false
      }

      onProgress?.('正在连接 DeepSeek API...')

      const response = await fetch(`${settings.apiBase || 'https://api.deepseek.com'}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '未知错误')
        throw new Error(`API 请求失败 (${response.status}): ${errText}`)
      }

      onProgress?.('正在解析返回结果...')

      const data = await response.json()

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('API 返回内容为空')
      }

      // 解析 JSON
      let parsed
      try {
        parsed = parseResponse(content)
      } catch (e) {
        // 如果解析失败，尝试用原始内容
        console.warn('JSON 解析失败，尝试修复...', e)
        // 返回原始内容供前端展示
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
