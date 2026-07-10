<template>
  <div class="page">
    <h2 class="page-title">📚 错题库</h2>
    <p class="page-subtitle">共 {{ totalCount }} 道错题</p>

    <!-- 筛选栏 -->
    <div class="filter-bar card-glass">
      <select v-model="filterSubject" class="input filter-select" @change="onFilterChange">
        <option value="">全部学科</option>
        <option v-for="s in subjectList" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="filterType" class="input filter-select" @change="onFilterChange">
        <option value="">全部题型</option>
        <option v-for="t in questionTypes" :key="t" :value="t">{{ t }}</option>
      </select>
      <input
        v-model="searchText"
        class="input filter-search"
        placeholder="搜索题目关键词..."
        @input="onSearch"
      />
    </div>

    <!-- 错题列表 -->
    <div v-if="loading" class="empty-state">
      <div class="spinner spinner-lg"></div>
      <p class="text-muted mt-2">加载中...</p>
    </div>

    <div v-else-if="questions.length === 0" class="empty-state">
      <div class="icon">📭</div>
      <p class="text">还没有错题记录</p>
      <p class="text-sm text-muted mt-2">去首页拍照添加吧</p>
    </div>

    <div v-else class="question-list">
      <div
        v-for="q in questions"
        :key="q.id"
        class="card question-card"
        :class="{ expanded: expandedId === q.id }"
        @click="toggleExpand(q.id)"
      >
        <!-- 摘要 -->
        <div class="q-summary">
          <div class="q-tags">
            <span class="tag tag-primary">{{ q.subject }}{{ q.subSubject ? '/' + q.subSubject : '' }}</span>
            <span class="tag tag-success">{{ q.questionType }}</span>
          </div>
          <p class="q-title">{{ q.title || '无题目' }}</p>
          <div class="q-meta">
            <span class="text-xs text-muted">{{ formatDate(q.createdAt) }}</span>
            <span class="expand-icon">{{ expandedId === q.id ? '▼' : '▶' }}</span>
          </div>
        </div>

        <!-- 详情 -->
        <div v-if="expandedId === q.id" class="q-detail">
          <div class="divider"></div>

          <!-- 原图 -->
          <div v-if="q.imageBase64" class="detail-section">
            <div class="detail-label">📷 原图</div>
            <img :src="q.imageBase64" alt="错题原图" class="detail-image" @click.stop />
          </div>

          <!-- 题目原文 -->
          <div class="detail-section">
            <div class="detail-label">📄 题目原文</div>
            <MathText class="detail-text" :text="q.originalText" />
          </div>

          <!-- 解题思路 -->
          <div v-if="q.solution?.thinking" class="detail-section">
            <div class="detail-label">💡 解题思路</div>
            <MathText class="detail-text" :text="q.solution.thinking" />
          </div>

          <!-- 答题流程 -->
          <div v-if="q.solution?.steps?.length" class="detail-section">
            <div class="detail-label">📝 答题流程</div>
            <div class="steps-list">
              <div v-for="(step, i) in q.solution.steps" :key="i" class="step-item">
                <span class="step-num">{{ i + 1 }}</span>
                <MathText class="detail-text" :text="step" />
              </div>
            </div>
          </div>

          <!-- 答案 -->
          <div v-if="q.solution?.answer" class="detail-section answer-section">
            <div class="detail-label">✅ 答案</div>
            <MathText class="answer-text" :text="q.solution.answer" />
          </div>

          <!-- 操作 -->
          <div class="detail-actions">
            <button class="btn btn-sm btn-outline" @click.stop="deleteQuestion(q.id)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDb } from '@/composables/useDb.js'
import { getSubjectList, QUESTION_TYPES } from '@/config/subjects.js'
import { showToast } from '@/stores/appState.js'
import MathText from '@/components/result/MathText.vue'

const { getQuestions, deleteQuestion: delQ, getCount } = useDb()

const questions = ref([])
const totalCount = ref(0)
const loading = ref(true)
const expandedId = ref(null)

const subjectList = getSubjectList()
const questionTypes = QUESTION_TYPES

const filterSubject = ref('')
const filterType = ref('')
const searchText = ref('')
let searchTimer = null

async function loadQuestions() {
  loading.value = true
  try {
    const filters = {}
    if (filterSubject.value) filters.subject = filterSubject.value
    if (filterType.value) filters.questionType = filterType.value
    if (searchText.value.trim()) filters.search = searchText.value.trim()

    questions.value = await getQuestions(filters)
    totalCount.value = await getCount()
  } catch (e) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  loadQuestions()
}

function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadQuestions()
  }, 300)
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

async function deleteQuestion(id) {
  if (!confirm('确定删除这道错题吗？')) return
  try {
    await delQ(id)
    showToast('已删除')
    loadQuestions()
  } catch (e) {
    showToast('删除失败')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

onMounted(loadQuestions)
</script>

<style scoped>
.page-title {
  font-size: 22px;
  font-weight: 800;
  padding-top: 12px;
}
.page-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.filter-select {
  font-size: 14px;
  padding: 10px 12px;
  min-height: 40px;
  appearance: auto;
}
.filter-search {
  font-size: 14px;
  padding: 10px 12px;
  min-height: 40px;
}

.question-card {
  cursor: pointer;
  transition: all 0.2s;
}
.question-card:active {
  transform: scale(0.99);
}

.q-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.q-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.q-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
}

.expand-icon {
  font-size: 12px;
  color: var(--text-muted);
}

/* 详情区域 */
.detail-section {
  margin-bottom: 14px;
}
.detail-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.detail-text {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-image {
  width: 100%;
  border-radius: var(--radius-sm);
  max-height: 300px;
  object-fit: contain;
  background: #f5f5f5;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.step-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.step-num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.answer-section {
  border-left: 3px solid var(--success);
  padding-left: 10px;
}
.answer-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--primary);
}

.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
