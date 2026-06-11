const mongoose = require('mongoose');

// A user's tracking record for a single catalog problem. Holds per-user
// progress (notes, solved state) while the problem metadata lives once in
// ProblemCatalog.
const userProblemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProblemCatalog',
      required: [true, 'Problem reference is required'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    isSolved: {
      type: Boolean,
      default: false,
    },
    solvedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// A user can track any given catalog problem only once.
userProblemSchema.index({ userId: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.model('UserProblem', userProblemSchema);
