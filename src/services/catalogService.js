const mongoose = require('mongoose');
const ProblemCatalog = require('../models/ProblemCatalog');
const AppError = require('../utils/AppError');
const { escapeRegex } = require('../utils/queryUtils');

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Build a Mongoose filter from query parameters.
 * Search matches the title (case-insensitive) OR the problem number.
 */
const buildCatalogFilter = (query) => {
  const filter = {};

  if (query.difficulty && VALID_DIFFICULTIES.includes(query.difficulty)) {
    filter.difficulty = query.difficulty;
  }

  if (query.tag) {
    filter.tags = query.tag;
  }

  if (query.search) {
    const searchPattern = escapeRegex(query.search);
    filter.$or = [
      { title: new RegExp(searchPattern, 'i') },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: '$problemNumber' },
            regex: searchPattern,
            options: 'i',
          },
        },
      },
    ];
  }

  return filter;
};

/**
 * Build sort options from query parameters.
 */
const buildCatalogSort = (sort) => {
  switch (sort) {
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'number-desc':
      return { problemNumber: -1 };
    case 'number-asc':
      return { problemNumber: 1 };
    case 'title-asc':
      return { title: 1 };
    case 'title-desc':
      return { title: -1 };
    default:
      return { problemNumber: 1 };
  }
};

/**
 * Normalize and clamp pagination params.
 */
const buildPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Get a paginated, filtered, sorted slice of the global catalog.
 */
const getCatalog = async (query = {}) => {
  const filter = buildCatalogFilter(query);
  const { page, limit, skip } = buildPagination(query);

  // Difficulty sort needs aggregation to order Easy < Medium < Hard.
  if (query.sort === 'difficulty') {
    const [result] = await ProblemCatalog.aggregate([
      { $match: filter },
      {
        $addFields: {
          difficultyOrder: {
            $switch: {
              branches: [
                { case: { $eq: ['$difficulty', 'Easy'] }, then: 1 },
                { case: { $eq: ['$difficulty', 'Medium'] }, then: 2 },
                { case: { $eq: ['$difficulty', 'Hard'] }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
      { $sort: { difficultyOrder: 1, problemNumber: 1 } },
      { $project: { difficultyOrder: 0 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const total = result?.totalCount?.[0]?.count || 0;
    return {
      data: result?.data || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  const [data, total] = await Promise.all([
    ProblemCatalog.find(filter).sort(buildCatalogSort(query.sort)).skip(skip).limit(limit),
    ProblemCatalog.countDocuments(filter),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get a single catalog problem by id.
 */
const getCatalogById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid problem id', 400);
  }

  const problem = await ProblemCatalog.findById(id);

  if (!problem) {
    throw new AppError('Problem not found', 404);
  }

  return problem;
};

/**
 * Get the full list of distinct tags across the catalog (sorted).
 */
const getCatalogTags = async () => {
  const tags = await ProblemCatalog.distinct('tags');
  return tags.filter(Boolean).sort((a, b) => a.localeCompare(b));
};

module.exports = {
  getCatalog,
  getCatalogById,
  getCatalogTags,
};
