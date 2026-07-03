/**
 * 学科分类配置
 * 集中管理，方便后续扩展
 */
export const SUBJECTS = {
  '数学': ['高等数学', '线性代数', '概率论与数理统计', '其他'],
  '408-数据结构': [],
  '408-计算机组成原理': [],
  '408-操作系统': [],
  '408-计算机网络': [],
  '物理': [],
  '化学': [],
  '英语': [],
  '语文': [],
  '生物': [],
  '历史': [],
  '地理': [],
  '政治': [],
  '其他': []
}

export const QUESTION_TYPES = [
  '选择题', '填空题', '判断题', '解答题',
  '计算题', '证明题', '综合题', '其他'
]

export function getSubjectList() {
  return Object.keys(SUBJECTS)
}

export function getSubSubjectList(subject) {
  return SUBJECTS[subject] || []
}
