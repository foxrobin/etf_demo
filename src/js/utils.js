/**
 * 通用工具函式
 */

/**
 * 跳脫 HTML，避免 XSS
 * @param {string} s - 原始字串
 * @returns {string}
 */
export function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
