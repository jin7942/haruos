/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷한다.
 *
 * @param date - Date 객체 또는 ISO 문자열
 * @returns 포맷된 날짜 문자열
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜를 YYYY-MM-DD HH:mm 형식으로 포맷한다.
 *
 * @param date - Date 객체 또는 ISO 문자열
 * @returns 포맷된 날짜시간 문자열
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const datePart = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}`;
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

/**
 * 상대 시간 문자열을 반환한다 (예: "3분 전", "2시간 전").
 *
 * @param date - Date 객체 또는 ISO 문자열
 * @returns 상대 시간 문자열
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 0) return '방금';
  if (seconds < MINUTE) return '방금';
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}분 전`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}시간 전`;
  if (seconds < DAY * 30) return `${Math.floor(seconds / DAY)}일 전`;
  if (seconds < DAY * 365) return `${Math.floor(seconds / (DAY * 30))}개월 전`;
  return `${Math.floor(seconds / (DAY * 365))}년 전`;
}
