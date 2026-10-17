/**
 * Input sanitization and escaping utilities
 */

/**
 * Escapes special regex characters in user search inputs to prevent
 * ReDoS (Regular Expression Denial of Service) and Mongo regex syntax errors.
 * Capped at 100 characters to prevent oversized regex payloads.
 *
 * @param {string} string - Raw user input
 * @returns {string} Sanitized string safe for new RegExp or Mongo $regex
 */
const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim().slice(0, 100);
};

module.exports = {
  escapeRegex,
};
