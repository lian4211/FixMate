<template>
  <span class="math-render" v-html="rendered"></span>
</template>

<script setup>
import { computed } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps({
  text: { type: String, default: '' }
})

/**
 * 将文本中的 $...$ 和 $$...$$ LaTeX 渲染为数学公式
 * 其余文本保持原样
 */
const rendered = computed(() => {
  if (!props.text) return ''
  
  let html = props.text
    // 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // 渲染块级公式 $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false
      })
    } catch (e) {
      return `<code>$$${formula}$$</code>`
    }
  })

  // 渲染行内公式 $...$
  html = html.replace(/\$([^\n$]*?)\$/g, (_, formula) => {
    if (formula.trim().length === 0) return '$'
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false
      })
    } catch (e) {
      return `<code>$${formula}$</code>`
    }
  })

  // 换行转 <br>
  html = html.replace(/\n/g, '<br>')

  return html
})
</script>

<style scoped>
.math-render :deep(.katex) {
  font-size: 1.05em;
}
.math-render :deep(.katex-display) {
  margin: 8px 0;
  overflow-x: auto;
  overflow-y: hidden;
}
.math-render :deep(code) {
  background: rgba(99,102,241,0.08);
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>
