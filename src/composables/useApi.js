import { ref } from 'vue'
import { getPrompt, parseResponse, validateResult } from '@/config/prompts.js'

export function useApi() {
  const loading = ref(false)
  const error = ref(null)
  const result = ref(null)
  const ocrText = ref('')

  /**
   * 分析错题图片 — 支持三种模式
   * mode='vision' : 直接发图片给视觉模型 (GPT-4o/Qwen-VL 等)
   * mode='ocr'    : Tesseract.js OCR → 文字发给模型分析
   */
  async function analyzeImage(imageBase64, settings, onProgress, mode = 'vision') {
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
      const prompt = getPrompt()

      // === 模式一：视觉模型（直接发图片） ===
      if (mode === 'vision') {
        onProgress?.('正在连接 AI...')

        const body = {
          model,
          messages: [
            { role: 'system', content: prompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: '请分析这张题目图片，按要求的 JSON 格式返回结果。' },
                { type: 'image_url', image_url: { url: imageBase64 } }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4096,
          stream: false
        }

        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          const errText = await response.text().catch(() => '未知错误')

          // 如果 vision 模式失败（模型不支持图片），自动降级到 OCR 模式
          if (errText.includes('image_url') || errText.includes('image')) {
            onProgress?.('视觉模式不支持，自动切换为 OCR 模式...')
            return await analyzeImage(imageBase64, settings, onProgress, 'ocr')
          }

          throw new Error(`API 请求失败 (${response.status}): ${errText}`)
        }

        onProgress?.('正在解析返回结果...')
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (!content) throw new Error('API 返回内容为空')

        return parseAndSetResult(content, null, settings)
      }

      // === 模式二：OCR + 文本分析 ===
      onProgress?.('正在识别图片中的文字...')

      const Tesseract = (await import('tesseract.js')).default
      const ocrResult = await Tesseract.recognize(imageBase64, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress?.(`OCR 识别中... ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      const recognizedText = ocrResult.data.text.trim()
      ocrText.value = recognizedText

      if (!recognizedText || recognizedText.length < 3) {
        throw new Error('OCR 未能识别出有效文字，请确保图片清晰')
      }

      onProgress?.('正在分析题目...')

      const body = {
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `以下是从图片中识别出的题目文字，请分析并按要求返回 JSON 格式的结果：\n\n${recognizedText}` }
        ],
        temperature: 0.1,
        max_tokens: 4096,
        stream: false
      }

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
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
      if (!content) throw new Error('API 返回内容为空')

      return parseAndSetResult(content, recognizedText, settings)

    } catch (e) {
      error.value = e.message || '未知错误'
      throw e
    } finally {
      loading.value = false
    }
  }

  function parseAndSetResult(content, ocrFallbackText, settings) {
    let parsed
    try {
      parsed = parseResponse(content)
    } catch (e) {
      console.warn('JSON 解析失败', e)
      parsed = {
        originalText: ocrFallbackText || content,
        subject: '其他', subSubject: '', questionType: '其他',
        solution: { thinking: '解析返回格式失败', steps: [], answer: content }
      }
    }

    if ((!parsed.originalText || parsed.originalText.length < 3) && ocrFallbackText) {
      parsed.originalText = ocrFallbackText
    }
    if (!parsed.subject) parsed.subject = '其他'
    if (!parsed.questionType) parsed.questionType = '其他'
    if (!parsed.solution) parsed.solution = { thinking: '', steps: [], answer: '' }
    if (!parsed.solution.thinking) parsed.solution.thinking = ''
    if (!parsed.solution.steps || !Array.isArray(parsed.solution.steps)) parsed.solution.steps = []
    if (!parsed.solution.answer) parsed.solution.answer = ''
    if (!parsed.originalText) parsed.originalText = '(未能识别出题目文字)'

    result.value = parsed
    return parsed
  }

  /** 纯文本分析（供手动输入使用） */
  async function analyzeText(text, settings, onProgress) {
    loading.value = true
    error.value = null
    result.value = null

    try {
      if (!settings.apiKey) throw new Error('请先填写 API Key')

      onProgress?.('正在分析题目...')

      const prompt = getPrompt()
      const response = await fetch(`${settings.apiBase || 'https://api.deepseek.com'}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model || 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `请分析以下题目，按要求的 JSON 格式返回结果：\n\n${text}` }
          ],
          temperature: 0.1,
          max_tokens: 4096
        })
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '未知错误')
        throw new Error(`API 请求失败 (${response.status}): ${errText}`)
      }

      onProgress?.('正在解析...')
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('API 返回内容为空')

      return parseAndSetResult(content, text, settings)
    } catch (e) {
      error.value = e.message || '未知错误'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { loading, error, result, ocrText, analyzeImage, analyzeText }
}
