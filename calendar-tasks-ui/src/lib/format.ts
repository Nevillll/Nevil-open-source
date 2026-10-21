/**
 * 格式化货币金额
 * @param amount 金额（单位：元）
 * @param currency 货币符号，默认 '¥'
 * @param decimals 小数位数，默认 2
 */
export function formatCurrency(
  amount: number,
  currency: string = '¥',
  decimals: number = 2
): string {
  const formatted = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
  return `${currency}${formatted}`
}

/**
 * 格式化数字
 * @param num 数字
 * @param decimals 小数位数，默认 0
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * 格式化百分比
 * @param value 数值（0-1 之间）
 * @param decimals 小数位数，默认 1
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 格式化趋势值（带符号）
 * @param value 趋势值
 * @param decimals 小数位数，默认 1
 */
export function formatTrend(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * 缩写大数字（如 1234 -> 1.2k）
 * @param num 数字
 */
export function abbreviateNumber(num: number): string {
  if (num < 1000) return num.toString()
  if (num < 1000000) return `${(num / 1000).toFixed(1)}k`
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`
  return `${(num / 1000000000).toFixed(1)}B`
}

/**
 * 格式化相对时间
 * @param date 日期
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - target.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}个月前`
  return `${Math.floor(diffDay / 365)}年前`
}
