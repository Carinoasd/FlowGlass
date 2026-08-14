// 流璃 FlowGlass — 農曆(使用 Intl chinese calendar,免查表)
const DAY_NAMES = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十',
];

const FESTIVALS = {
  '正月-1': '春節',
  '正月-15': '元宵節',
  '五月-5': '端午節',
  '七月-7': '七夕',
  '七月-15': '中元節',
  '八月-15': '中秋節',
  '九月-9': '重陽節',
  '臘月-8': '臘八',
};

const fmt = new Intl.DateTimeFormat('zh-Hant-u-ca-chinese', {
  month: 'long',
  day: 'numeric',
});

function parts(date) {
  const p = {};
  for (const { type, value } of fmt.formatToParts(date)) p[type] = value;
  // 正規化月名:V8 可能給「十二月」,節日表用「臘月」對照
  let month = p.month || '';
  const day = parseInt(p.day, 10) || 1;
  return { month, day };
}

function festivalOf(month, day, date) {
  const key = `${month}-${day}`;
  if (FESTIVALS[key]) return FESTIVALS[key];
  // 十二月/臘月同義
  if (month === '十二月' && FESTIVALS[`臘月-${day}`]) return FESTIVALS[`臘月-${day}`];
  // 除夕:明天是正月初一
  const tomorrow = new Date(date.getTime() + 86400000);
  const tp = parts(tomorrow);
  if (tp.month === '正月' && tp.day === 1) return '除夕';
  return null;
}

// 回傳 { text: '農曆七月初二', festival: '中秋節'|null }
// simplified = true 時字首用「农历」
export function lunarInfo(date = new Date(), simplified = false) {
  try {
    const { month, day } = parts(date);
    const dayName = DAY_NAMES[day - 1] || String(day);
    return {
      text: `${simplified ? '农历' : '農曆'}${month}${dayName}`,
      festival: festivalOf(month, day, date),
    };
  } catch {
    return { text: '', festival: null };
  }
}
