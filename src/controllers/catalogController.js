const catalogService = require('../services/catalogService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * GET /api/catalog
 * Supports: search, difficulty, tag, page, limit, sort
 */
const getCatalog = asyncHandler(async (req, res) => {
  const { data, total, page, limit, totalPages } = await catalogService.getCatalog(
    req.query
  );

  res.status(200).json({
    success: true,
    count: data.length,
    total,
    page,
    limit,
    totalPages,
    data,
  });
});

/**
 * GET /api/catalog/tags
 */
const getCatalogTags = asyncHandler(async (req, res) => {
  const tags = await catalogService.getCatalogTags();

  res.status(200).json({
    success: true,
    count: tags.length,
    data: tags,
  });
});

/**
 * GET /api/catalog/:id
 */
const getCatalogById = asyncHandler(async (req, res) => {
  const problem = await catalogService.getCatalogById(req.params.id);

  res.status(200).json({
    success: true,
    data: problem,
  });
});

module.exports = {
  getCatalog,
  getCatalogTags,
  getCatalogById,
};
