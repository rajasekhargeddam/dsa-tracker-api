const Revision = require('../models/Revision');
const AppError = require('../utils/AppError');
const { addDays, getEndOfToday } = require('../utils/dateUtils');

const REVISION_INTERVALS = {
  1: { initialDelay: 3, nextUnlockDelay: 7 },
  2: { nextUnlockDelay: 20 },
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
 * Create all three revision stages when a problem is marked as solved.
 *
 * All three start LOCKED. Revision 1 already has a due date (solved + 3 days)
 * and will auto-unlock to PENDING once that date arrives (see syncRevisionStatuses).
 * Revisions 2 and 3 have no due date yet — they are scheduled only once the
 * previous revision is completed.
 */
const createRevisionsForUserProblem = async (userId, userProblemId, solvedDate) => {
  const revisions = [
    {
      userId,
      userProblemId,
      revisionLevel: 1,
      dueDate: addDays(solvedDate, REVISION_INTERVALS[1].initialDelay),
      status: 'LOCKED',
    },
    {
      userId,
      userProblemId,
      revisionLevel: 2,
      dueDate: null,
      status: 'LOCKED',
    },
    {
      userId,
      userProblemId,
      revisionLevel: 3,
      dueDate: null,
      status: 'LOCKED',
    },
  ];

  return Revision.insertMany(revisions);
};

/**
 * Delete all revisions linked to a user problem.
 */
const deleteRevisionsByUserProblemId = async (userProblemId) => {
  return Revision.deleteMany({ userProblemId });
};

/**
 * Reconcile revision statuses against the clock — the time gate. Called lazily
 * at the start of every revision read so statuses stay accurate without a cron
 * job. Two directions:
 *   - LOCKED + due today or earlier  -> PENDING  (its due date has arrived)
 *   - PENDING + due in the future    -> LOCKED   (not due yet; also self-heals
 *     any data created under the old logic that marked revisions PENDING early)
 * A PENDING revision therefore always means "unlocked and completable now".
 */
const syncRevisionStatuses = async (userId) => {
  const end = getEndOfToday();
  await Promise.all([
    Revision.updateMany(
      { userId, status: 'LOCKED', dueDate: { $ne: null, $lte: end } },
      { $set: { status: 'PENDING' } }
    ),
    Revision.updateMany(
      { userId, status: 'PENDING', dueDate: { $gt: end } },
      { $set: { status: 'LOCKED' } }
    ),
  ]);
};

/**
 * Build a Mongoose filter from query parameters.
 */
const buildRevisionFilter = (userId, query) => {
  const filter = { userId };

  if (query.status) {
    // Accept both uppercase and lowercase
    const statusMap = {
      'pending': 'PENDING',
      'PENDING': 'PENDING',
      'completed': 'COMPLETED',
      'COMPLETED': 'COMPLETED',
      'locked': 'LOCKED',
      'LOCKED': 'LOCKED',
    };
    const normalizedStatus = statusMap[query.status];
    if (normalizedStatus) {
      filter.status = normalizedStatus;
    }
  }

  if (query.revisionLevel) {
    filter.revisionLevel = Number(query.revisionLevel);
  }

  return filter;
};

/**
 * Get all revisions with optional filters.
 */
const getAllRevisions = async (userId, query = {}) => {
  await syncRevisionStatuses(userId);
  const filter = buildRevisionFilter(userId, query);
  return Revision.find(filter)
    .populate(USER_PROBLEM_POPULATE)
    .sort({ dueDate: 1, revisionLevel: 1 });
};

/**
 * Complete a revision and unlock the next stage if applicable.
 */
const completeRevision = async (userId, revisionId) => {
  const revision = await Revision.findOne({ _id: revisionId, userId });

  if (!revision) {
    throw new AppError('Revision not found', 404);
  }

  if (revision.status === 'COMPLETED') {
    throw new AppError('This revision has already been completed', 400);
  }

  // Time gate: a revision can only be completed once its due date has arrived.
  // No due date means the previous revision has not been completed yet.
  if (!revision.dueDate) {
    throw new AppError(
      'This revision is locked. Complete the previous revision first.',
      400
    );
  }

  if (new Date(revision.dueDate) > getEndOfToday()) {
    throw new AppError(
      'This revision is not due for review yet. It unlocks on its due date.',
      400
    );
  }

  const completedDate = new Date();
  revision.completedDate = completedDate;
  revision.status = 'COMPLETED';
  await revision.save();

  // Schedule the next revision stage: set its due date and leave it LOCKED.
  // It auto-unlocks to PENDING once that due date arrives.
  if (revision.revisionLevel < 3) {
    const nextLevel = revision.revisionLevel + 1;
    const delayDays = REVISION_INTERVALS[revision.revisionLevel].nextUnlockDelay;

    const nextRevision = await Revision.findOne({
      userProblemId: revision.userProblemId,
      revisionLevel: nextLevel,
    });

    if (nextRevision) {
      nextRevision.dueDate = addDays(completedDate, delayDays);
      nextRevision.status = 'LOCKED';
      await nextRevision.save();
    } else {
      console.warn(
        `Warning: Revision level ${nextLevel} not found for user problem ${revision.userProblemId}`
      );
    }
  }

  return Revision.findOne({ _id: revisionId, userId }).populate(USER_PROBLEM_POPULATE);
};

module.exports = {
  createRevisionsForUserProblem,
  deleteRevisionsByUserProblemId,
  syncRevisionStatuses,
  getAllRevisions,
  completeRevision,
};
