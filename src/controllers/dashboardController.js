const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * GET /api/dashboard
 * Returns stats + today's/upcoming revisions + recently tracked problems.
 */
const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCompleteDashboard(req.userId);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getDashboard,
};
