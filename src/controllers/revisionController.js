const revisionService = require('../services/revisionService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * GET /api/revisions
 */
const getAllRevisions = asyncHandler(async (req, res) => {
  const revisions = await revisionService.getAllRevisions(req.userId, req.query);

  res.status(200).json({
    success: true,
    count: revisions.length,
    data: revisions,
  });
});

/**
 * PATCH /api/revisions/:id/complete
 */
const completeRevision = asyncHandler(async (req, res) => {
  const revision = await revisionService.completeRevision(req.userId, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Revision completed successfully',
    data: revision,
  });
});

module.exports = {
  getAllRevisions,
  completeRevision,
};
