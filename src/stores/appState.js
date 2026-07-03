import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

export function showToast(message, duration = 2500) {
  const id = ++toastId
  toasts.value.push({ id, message })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

/**
 * Toast 渲染组件 — 在 App.vue 中引入
 */
export { toasts }
