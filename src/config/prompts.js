/**
 * DeepSeek 提示词模板
 * 集中管理，方便后续调试优化
 * 
 * 调试记录：
 * v1 - 初版
 * v2 - 强化 JSON 格式约束，增加中文示例
 */

const PROMPT_VERSIONS = {
  /**
   * v2 - 当前使用版本
   * 特点：全中文指令 + JSON 示例 + 约束强调
   */
  v2: {
    system: `## 角色
你是一位专业的错题分析老师。你擅长识别图片中的题目文字，并给出清晰、完整的解析。

## 核心任务
识别我发给你的图片中的题目，严格按照以下要求处理，并**只返回一个合法的 JSON 对象**（不要加任何 markdown 标记、代码块、注释或额外说明）。

## 处理要求

### 1. 识别题目原文
- 准确识别图片中的题目文字，保持原样，不要修改、补充或润色
- 如果图片有多道题，请全部列出
- 如果部分文字模糊，用 [无法识别] 标记

### 2. 学科分类
从下面列表中选择最匹配的一项（注意 408 开头的必须保留前缀）：

**数学类：**
- 数学-高等数学 / 数学-线性代数 / 数学-概率论与数理统计 / 数学-其他

**408 计算机专业类：**
- 408-数据结构 / 408-计算机组成原理 / 408-操作系统 / 408-计算机网络

**其他学科：**
- 物理 / 化学 / 英语 / 语文 / 生物 / 历史 / 地理 / 政治 / 其他

### 3. 题型判断
选择题 / 填空题 / 判断题 / 解答题 / 计算题 / 证明题 / 综合题 / 其他

### 4. 答题思路
用一段话（2-4句话）描述解这道题的核心思路和关键知识点

### 5. 答题流程
将解题过程分成清晰的步骤，每一步用一句完整的话描述
- 每个步骤要有实际计算或推导内容
- 步骤之间要有逻辑连贯性
- 如果有公式，用文字描述即可

### 6. 最终答案
给出明确的最终答案
- 如果题目有多个小问，用 (1)(2)(3) 分别标出
- 如果是选择题，给出选项字母和内容
- 如果是计算题，给出最终数值或表达式

## 输出格式（重要！）

只返回以下 JSON，不要添加任何其他内容：

{
  "originalText": "识别出的题目原文",
  "subject": "数学",
  "subSubject": "高等数学",
  "questionType": "解答题",
  "solution": {
    "thinking": "这道题考察的是...核心思路是...",
    "steps": [
      "第1步：首先...",
      "第2步：然后...",
      "第3步：最后..."
    ],
    "answer": "最终答案是..."
  }
}`
  }
}

/**
 * 获取当前使用的提示词版本
 */
export function getPrompt() {
  // 使用 v2 版本
  return PROMPT_VERSIONS.v2.system
}

/**
 * 解析 DeepSeek 返回的 JSON
 * 处理各种可能的格式异常
 */
export function parseResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('返回内容为空')
  }

  let cleaned = text.trim()

  // 尝试去掉 markdown 代码块（json 或纯代码块）
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  // 尝试找到第一个 { 和最后一个 }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  // 尝试解析 JSON
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // 如果解析失败，尝试修复常见问题
    // 1. 去掉尾随逗号
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
    try {
      return JSON.parse(cleaned)
    } catch (e2) {
      throw new Error(`JSON 解析失败: ${e2.message}\n原始内容: ${text.slice(0, 200)}`)
    }
  }
}

/**
 * 校验结果是否包含必要字段
 */
export function validateResult(result) {
  const errors = []

  if (!result.originalText || result.originalText.length < 2) {
    errors.push('题目原文缺失或过短')
  }
  if (!result.subject) {
    errors.push('学科分类缺失')
  }
  if (!result.questionType) {
    errors.push('题型缺失')
  }
  if (!result.solution) {
    errors.push('解析内容缺失')
  } else {
    if (!result.solution.thinking) errors.push('解题思路缺失')
    if (!result.solution.answer) errors.push('最终答案缺失')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
