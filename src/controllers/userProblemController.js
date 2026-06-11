const userProblemService = require('../services/userProblemService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * POST /api/my-problems
 * Add a catalog problem to the current user's tracker.
 */
const addProblem = asyncHandler(async (req, res) => {
  const userProblem = await userProblemService.addProblem(
    req.userId,
    req.body.problemId
  );

  res.status(201).json({
    success: true,
    data: userProblem,
  });
});

/**
 * GET /api/my-problems
 */
const getMyProblems = asyncHandler(async (req, res) => {
  const problems = await userProblemService.getMyProblems(req.userId, req.query);

  res.status(200).json({
    success: true,
    count: problems.length,
    data: problems,
  });
});

/**
 * GET /api/my-problems/:id
 */
const getMyProblemById = asyncHandler(async (req, res) => {
  const data = await userProblemService.getMyProblemById(req.userId, req.params.id);

  res.status(200).json({
    success: true,
    data,
  });
});

/**
 * PATCH /api/my-problems/:id/notes
 */
const updateNotes = asyncHandler(async (req, res) => {
  const userProblem = await userProblemService.updateNotes(
    req.userId,
    req.params.id,
    req.body.notes
  );

  res.status(200).json({
    success: true,
    data: userProblem,
  });
});

/**
 * PATCH /api/my-problems/:id/solve
 */
const solveProblem = asyncHandler(async (req, res) => {
  const { userProblem, revisions } = await userProblemService.solveProblem(
    req.userId,
    req.params.id
  );

  res.status(200).json({
    success: true,
    message: 'Problem marked as solved. Revision stages created.',
    data: {
      userProblem,
      revisions,
    },
  });
});

/**
 * DELETE /api/my-problems/:id
 */
const deleteUserProblem = asyncHandler(async (req, res) => {
  await userProblemService.deleteUserProblem(req.userId, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Problem removed from tracker and related revisions deleted.',
  });
});

module.exports = {
  addProblem,
  getMyProblems,
  getMyProblemById,
  updateNotes,
  solveProblem,
  deleteUserProblem,
};
