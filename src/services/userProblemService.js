const mongoose = require('mongoose');
const UserProblem = require('../models/UserProblem');
const ProblemCatalog = require('../models/ProblemCatalog');
const Revision = require('../models/Revision');
const AppError = require('../utils/AppError');
const { escapeRegex } = require('../utils/queryUtils');
const revisionService = require('./revisionService');

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const CATALOG_FIELDS = 'problemNumber title difficulty tags slug leetcodeUrl';

/**
 * Build the post-$lookup $match stage that filters on catalog fields and the
 * user's solved status. The catalog problem is joined under `problem`.
 */
const buildMyProblemsMatch = (query) => {
  const match = {};

  if (query.difficulty && VALID_DIFFICULTIES.includes(query.difficulty)) {
    match['problem.difficulty'] = query.difficulty;
  }

  if (query.tag) {
    match['problem.tags'] = query.tag;
  }

  const status = typeof query.status === 'string' ? query.status.toLowerCase() : undefined;
  if (status === 'solved') {
    match.isSolved = true;
  } else if (status === 'unsolved') {
    match.isSolved = false;
  } else if (query.isSolved !== undefined) {
    match.isSolved = query.isSolved === 'true';
  }

  if (query.search) {
    const searchPattern = escapeRegex(query.search);
    match.$or = [
      { 'problem.title': new RegExp(searchPattern, 'i') },
      {
        $expr: {
          $regexMatch: {
            input: { $toString: '$problem.problemNumber' },
            regex: searchPattern,
            options: 'i',
          },
        },
      },
    ];
  }

  return match;
};

/**
 * Build the aggregation $sort stage (operates on joined catalog fields).
 */
const buildMyProblemsSort = (sort) => {
  switch (sort) {
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'number-desc':
      return { 'problem.problemNumber': -1 };
    case 'number-asc':
      return { 'problem.problemNumber': 1 };
    case 'difficulty':
      return { difficultyOrder: 1, 'problem.problemNumber': 1 };
    default:
      return { 'problem.problemNumber': 1 };
  }
};

/**
 * Add a catalog problem to the current user's tracker.
 */
const addProblem = async (userId, problemId) => {
  if (!problemId || !mongoose.Types.ObjectId.isValid(problemId)) {
    throw new AppError('A valid problemId is required', 400);
  }

  const catalogProblem = await ProblemCatalog.findById(problemId);
  if (!catalogProblem) {
    throw new AppError('Catalog problem not found', 404);
  }

  try {
    const userProblem = await UserProblem.create({ userId, problemId });
    return userProblem;
  } catch (error) {
    // Unique (userId, problemId) index violation: already tracked.
    if (error.code === 11000) {
      throw new AppError('Problem is already in your tracker', 409);
    }
    throw error;
  }
};

/**
 * List the current user's tracked problems with catalog metadata joined in.
 */
const getMyProblems = async (userId, query = {}) => {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'problemcatalogs',
        localField: 'problemId',
        foreignField: '_id',
        as: 'problem',
      },
    },
    { $unwind: '$problem' },
    { $match: buildMyProblemsMatch(query) },
  ];

  if (query.sort === 'difficulty') {
    pipeline.push({
      $addFields: {
        difficultyOrder: {
          $switch: {
            branches: [
              { case: { $eq: ['$problem.difficulty', 'Easy'] }, then: 1 },
              { case: { $eq: ['$problem.difficulty', 'Medium'] }, then: 2 },
              { case: { $eq: ['$problem.difficulty', 'Hard'] }, then: 3 },
            ],
            default: 4,
          },
        },
      },
    });
  }

  pipeline.push({ $sort: buildMyProblemsSort(query.sort) });

  if (query.sort === 'difficulty') {
    pipeline.push({ $project: { difficultyOrder: 0 } });
  }

  // Join revisions to surface progress (completed vs total) on each card.
  pipeline.push(
    {
      $lookup: {
        from: 'revisions',
        localField: '_id',
        foreignField: 'userProblemId',
        as: 'revisions',
      },
    },
    {
      $addFields: {
        revisionsTotal: { $size: '$revisions' },
        revisionsCompleted: {
          $size: {
            $filter: {
              input: '$revisions',
              cond: { $eq: ['$$this.status', 'COMPLETED'] },
            },
          },
        },
      },
    },
    { $project: { revisions: 0 } }
  );

  return UserProblem.aggregate(pipeline);
};

/**
 * Get a single tracked problem with its catalog details and revisions.
 */
const getMyProblemById = async (userId, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid problem id', 400);
  }

  const userProblem = await UserProblem.findOne({ _id: id, userId }).populate(
    'problemId',
    CATALOG_FIELDS
  );

  if (!userProblem) {
    throw new AppError('Problem not found in your tracker', 404);
  }

  // Reflect any revisions whose due date has arrived before rendering the timeline.
  await revisionService.syncRevisionStatuses(userId);

  const revisions = await Revision.find({ userId, userProblemId: id }).sort({
    revisionLevel: 1,
  });

  return { userProblem, problem: userProblem.problemId, revisions };
};

/**
 * Update only the notes field.
 */
const updateNotes = async (userId, id, notes) => {
  if (notes === undefined) {
    throw new AppError('Notes field is required', 400);
  }

  const userProblem = await UserProblem.findOneAndUpdate(
    { _id: id, userId },
    { notes },
    { new: true, runValidators: true }
  ).populate('problemId', CATALOG_FIELDS);

  if (!userProblem) {
    throw new AppError('Problem not found in your tracker', 404);
  }

  return userProblem;
};

/**
 * Mark a tracked problem as solved and create its revision stages.
 */
const solveProblem = async (userId, id) => {
  const userProblem = await UserProblem.findOne({ _id: id, userId });

  if (!userProblem) {
    throw new AppError('Problem not found in your tracker', 404);
  }

  if (userProblem.isSolved) {
    throw new AppError('Problem is already marked as solved', 400);
  }

  const solvedDate = new Date();
  userProblem.isSolved = true;
  userProblem.solvedDate = solvedDate;

  try {
    await userProblem.save();
    const revisions = await revisionService.createRevisionsForUserProblem(
      userId,
      userProblem._id,
      solvedDate
    );
    await userProblem.populate('problemId', CATALOG_FIELDS);
    return { userProblem, revisions };
  } catch (error) {
    // insertMany is not atomic; clean up any partial revisions so a retry isn't
    // blocked by the unique index, then revert the solved status.
    await revisionService.deleteRevisionsByUserProblemId(userProblem._id);
    userProblem.isSolved = false;
    userProblem.solvedDate = null;
    await userProblem.save();
    throw new AppError(
      `Failed to create revisions: ${error.message}. Problem status reverted.`,
      500
    );
  }
};

/**
 * Remove a problem from the user's tracker, deleting its revisions too.
 */
const deleteUserProblem = async (userId, id) => {
  const userProblem = await UserProblem.findOne({ _id: id, userId });

  if (!userProblem) {
    throw new AppError('Problem not found in your tracker', 404);
  }

  await revisionService.deleteRevisionsByUserProblemId(userProblem._id);
  await UserProblem.deleteOne({ _id: id, userId });

  return userProblem;
};

module.exports = {
  addProblem,
  getMyProblems,
  getMyProblemById,
  updateNotes,
  solveProblem,
  deleteUserProblem,
};
