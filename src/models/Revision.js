const mongoose = require('mongoose');

const revisionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    userProblemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProblem',
      required: [true, 'User problem reference is required'],
    },
    revisionLevel: {
      type: Number,
      required: [true, 'Revision level is required'],
      enum: {
        values: [1, 2, 3],
        message: 'Revision level must be 1, 2, or 3',
      },
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['LOCKED', 'PENDING', 'COMPLETED'],
        message: '{VALUE} is not a valid status',
      },
    },
  },
  {
    timestamps: true,
  }
);

revisionSchema.index(
  { userId: 1, userProblemId: 1, revisionLevel: 1 },
  { unique: true }
);

module.exports = mongoose.model('Revision', revisionSchema);
