import { ref } from 'vue'

const STORAGE_KEY = 'fixmate_settings'

const defaults = {
  // DeepSeek
  apiKey: '',
  model: 'deepseek-v4-flash',
  apiBase: 'https://api.deepseek.com',
  // Bailian / 百炼
  bailianApiKey: '',
  bailianModel: 'qwen3-vl-plus',
  bailianApiBase: 'https://dashscope.aliyuncs.com'
}

export function useSettings() {
  const settings = ref({ ...defaults })

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        settings.value = { ...defaults, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('Failed to load settings:', e)
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  function update(key, value) {
    settings.value[key] = value
    save()
  }

  function clear() {
    settings.value = { ...defaults }
    save()
  }

  function hasApiKey() {
    return !!settings.value.apiKey
  }

  function hasBailianKey() {
    return !!settings.value.bailianApiKey
  }

  // 立即加载
  load()

  return { settings, load, save, update, clear, hasApiKey, hasBailianKey }
}
