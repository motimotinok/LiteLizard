const KANJI_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

/**
 * 1〜99 の整数を漢数字（一・二・…・九十九）に変換する。
 * 0 や 100 以上、負数は半角アラビア数字を返す。
 */
export function toKanjiIndex(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    return String(n);
  }

  if (n < 10) {
    return KANJI_DIGITS[n];
  }

  if (n === 10) {
    return '十';
  }

  if (n < 20) {
    return `十${KANJI_DIGITS[n - 10]}`;
  }

  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) {
    return `${KANJI_DIGITS[tens]}十`;
  }
  return `${KANJI_DIGITS[tens]}十${KANJI_DIGITS[ones]}`;
}
