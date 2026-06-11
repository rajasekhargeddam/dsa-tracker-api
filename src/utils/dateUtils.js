/**
 * Returns end of today in UTC (23:59:59.999) for due-date comparisons.
 * @returns {Date}
 */
const getEndOfToday = () => {
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  return today;
};

/**
 * Add a number of days to a given date.
 * @param {Date} date - Base date
 * @param {number} days - Days to add
 * @returns {Date}
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

module.exports = {
  getEndOfToday,
  addDays,
};
