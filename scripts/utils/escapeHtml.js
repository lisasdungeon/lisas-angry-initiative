const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
};

/**
 * Escape a value for safe interpolation into raw HTML strings (chat messages,
 * dialog content, dynamic `innerHTML` payloads). Non-string values are coerced;
 * null / undefined become an empty string so templates never render "null".
 *
 * Adapted from `ld-spellbook/core/utils/escapeHtml.js`. Foundry VTT modules
 * run in isolation without a shared module system, so each module ships its
 * own copy of this tiny helper.
 *
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, char => HTML_ESCAPES[char]);
}
