import { ref } from 'vue'
import Tesseract from 'tesseract.js'
import { getPrompt, parseResponse, validateResult } from '@/config/prompts.js'

export function useApi() {
  const loading = ref(false)
  const error = ref(null)
  const result = ref(null)
  const ocrText = ref('')  // OCR 识别出的文字

  /**
   * 两步流程：
   * 1) Tesseract.js 浏览器 OCR 识别图片文字
   * 2) 将识别出的文字发给 DeepSeek V4 Flash 分析
   */
  async function analyzeImage(imageDataUrl, settings, onProgress) {
    loading.value = true
    error.value = null
    result.value = null
    ocrText.value = ''

    try {
      if (!settings.apiKey) {
        throw new Error('请先填写 API Key')
      }

      const baseUrl = settings.apiBase || 'https://api.deepseek.com'
      const model = settings.model || 'deepseek-v4-flash'

      // ----- 第一步：OCR 识别图片文字 -----
      onProgress?.('正在识别图片中的文字...')

      const ocrResult = await Tesseract.recognize(
        imageDataUrl,
        'chi_sim+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const pct = Math.round(m.progress * 100)
              onProgress?.(`OCR 识别中... ${pct}%`)
            }
          }
        }
      )

      const recognizedText = ocrResult.data.text.trim()
      ocrText.value = recognizedText

      if (!recognizedText || recognizedText.length < 3) {
        throw new Error('OCR 未能识别出有效文字，请确保图片清晰')
      }

      // ----- 第二步：调用 DeepSeek API 分析题目 -----
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
            content: `以下是从图片中识别出的题目文字，请分析并按要求返回 JSON 格式的结果：\n\n${recognizedText}`
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

      // 解析 JSON
      let parsed
      try {
        parsed = parseResponse(content)
      } catch (e) {
        console.warn('JSON 解析失败，尝试修复...', e)
        parsed = {
          originalText: recognizedText,
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

      // 如果 AI 没有返回正确的原文，用 OCR 结果作为原文
      if (!parsed.originalText || parsed.originalText.length < 3) {
        parsed.originalText = recognizedText
      }

      // 校验必要字段
      const validation = validateResult(parsed)
      if (!validation.valid) {
        console.warn('格式校验警告:', validation.errors.join(', '))
      }

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

  return { loading, error, result, ocrText, analyzeImage }
}
