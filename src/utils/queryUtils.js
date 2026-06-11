/**
 * Escape special regex characters in a search string.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  escapeRegex,
};
