import Dexie from 'dexie'

let db = null

function getDb() {
  if (!db) {
    db = new Dexie('FixMateDB')
    db.version(1).stores({
      questions: '++id, subject, subSubject, questionType, createdAt'
    })
  }
  return db
}

export function useDb() {
  /**
   * 添加错题
   */
  async function addQuestion(data) {
    const db = getDb()
    const now = new Date().toISOString()
    const record = {
      ...data,
      createdAt: now,
      reviewedCount: 0,
      lastReviewedAt: null,
      mastery: 0
    }
    const id = await db.questions.add(record)
    return { ...record, id }
  }

  /**
   * 获取错题列表（支持筛选和搜索）
   */
  async function getQuestions(filters = {}) {
    const db = getDb()
    let collection = db.questions.orderBy('createdAt').reverse()

    let all = await collection.toArray()

    if (filters.subject) {
      all = all.filter(q => q.subject === filters.subject)
    }
    if (filters.subSubject) {
      all = all.filter(q => q.subSubject === filters.subSubject)
    }
    if (filters.questionType) {
      all = all.filter(q => q.questionType === filters.questionType)
    }
    if (filters.search) {
      const kw = filters.search.toLowerCase()
      all = all.filter(q =>
        (q.originalText && q.originalText.toLowerCase().includes(kw)) ||
        (q.title && q.title.toLowerCase().includes(kw))
      )
    }

    return all
  }

  /**
   * 获取单条错题
   */
  async function getQuestion(id) {
    const db = getDb()
    return db.questions.get(id)
  }

  /**
   * 更新错题
   */
  async function updateQuestion(id, data) {
    const db = getDb()
    await db.questions.update(id, data)
    return getQuestion(id)
  }

  /**
   * 删除错题
   */
  async function deleteQuestion(id) {
    const db = getDb()
    await db.questions.delete(id)
  }

  /**
   * 获取所有学科分类及其数量
   */
  async function getSubjectStats() {
    const db = getDb()
    const all = await db.questions.toArray()
    const stats = {}
    for (const q of all) {
      const key = q.subject + (q.subSubject ? '-' + q.subSubject : '')
      stats[key] = (stats[key] || 0) + 1
    }
    return stats
  }

  /**
   * 获取总数
   */
  async function getCount() {
    const db = getDb()
    return db.questions.count()
  }

  /**
   * 导出所有数据
   */
  async function exportAll() {
    const db = getDb()
    const all = await db.questions.toArray()
    return JSON.stringify(all, null, 2)
  }

  /**
   * 导入数据
   */
  async function importAll(jsonStr) {
    const db = getDb()
    const data = JSON.parse(jsonStr)
    if (!Array.isArray(data)) throw new Error('数据格式错误')
    await db.transaction('rw', db.questions, async () => {
      await db.questions.clear()
      for (const item of data) {
        await db.questions.add(item)
      }
    })
    return data.length
  }

  /**
   * 清空所有数据
   */
  async function clearAll() {
    const db = getDb()
    await db.questions.clear()
  }

  return {
    addQuestion,
    getQuestions,
    getQuestion,
    updateQuestion,
    deleteQuestion,
    getSubjectStats,
    getCount,
    exportAll,
    importAll,
    clearAll
  }
}
