const UserProblem = require('../models/UserProblem');
const Revision = require('../models/Revision');
const revisionService = require('./revisionService');
const { getEndOfToday } = require('../utils/dateUtils');

const CATALOG_POPULATE = {
  path: 'problemId',
  select: 'problemNumber title difficulty tags slug leetcodeUrl',
};

// Populate the linked UserProblem and, nested under it, the catalog metadata.
const USER_PROBLEM_POPULATE = {
  path: 'userProblemId',
  select: 'notes isSolved solvedDate problemId',
  populate: {
    path: 'problemId',
    select: 'problemNumber title difficulty tags slug leetcodeUrl',
  },
};

/**
 * Get dashboard summary statistics.
 */
const getDashboardStats = async (userId) => {
  await revisionService.syncRevisionStatuses(userId);
  const [
    totalProblems,
    solvedProblems,
    unsolvedProblems,
    pendingRevisions,
    completedRevisions,
  ] = await Promise.all([
    UserProblem.countDocuments({ userId }),
    UserProblem.countDocuments({ userId, isSolved: true }),
    UserProblem.countDocuments({ userId, isSolved: false }),
    Revision.countDocuments({ userId, status: 'PENDING' }),
    Revision.countDocuments({ userId, status: 'COMPLETED' }),
  ]);

  return {
    totalProblems,
    solvedProblems,
    unsolvedProblems,
    pendingRevisions,
    completedRevisions,
  };
};

/**
 * Get revisions due today or earlier (PENDING).
 */
const getTodayRevisions = async (userId) => {
  await revisionService.syncRevisionStatuses(userId);
  return Revision.find({
    userId,
    status: 'PENDING',
    dueDate: { $lte: getEndOfToday() },
  })
    .populate(USER_PROBLEM_POPULATE)
    .sort({ dueDate: 1 });
};

/**
 * Get upcoming revisions: scheduled for a future date but not yet due (still
 * LOCKED) and not yet completed, ordered by due date.
 */
const getUpcomingRevisions = async (userId) => {
  await revisionService.syncRevisionStatuses(userId);
  return Revision.find({
    userId,
    status: { $ne: 'COMPLETED' },
    dueDate: { $ne: null, $gt: getEndOfToday() },
  })
    .populate(USER_PROBLEM_POPULATE)
    .sort({ dueDate: 1 });
};

/**
 * Get the 10 most recently tracked problems.
 */
const getRecentProblems = async (userId) => {
  return UserProblem.find({ userId })
    .populate(CATALOG_POPULATE)
    .sort({ createdAt: -1 })
    .limit(10);
};

/**
 * Get complete dashboard data in one call.
 */
const getCompleteDashboard = async (userId) => {
  const [stats, todayRevisions, upcomingRevisions, recentProblems] = await Promise.all([
    getDashboardStats(userId),
    getTodayRevisions(userId),
    getUpcomingRevisions(userId),
    getRecentProblems(userId),
  ]);

  return {
    stats,
    todayRevisions,
    upcomingRevisions,
    recentProblems,
  };
};

module.exports = {
  getDashboardStats,
  getTodayRevisions,
  getUpcomingRevisions,
  getRecentProblems,
  getCompleteDashboard,
};
