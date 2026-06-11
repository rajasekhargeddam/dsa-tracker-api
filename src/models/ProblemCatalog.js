const mongoose = require("mongoose");

// Global, deduplicated catalog of LeetCode problems. Every problem exists here
// exactly once; users track their own progress via the UserProblem model.
const problemCatalogSchema = new mongoose.Schema(
  {
    problemNumber: {
      type: Number,
      required: [true, "Problem number is required"],
      min: [1, "Problem number must be greater than 0"],
      validate: {
        validator: Number.isInteger,
        message: "Problem number must be a whole number",
      },
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required"],
      enum: {
        values: ["Easy", "Medium", "Hard"],
        message:
          "{VALUE} is not a valid difficulty. Use Easy, Medium, or Hard.",
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    slug: {
      type: String,
      trim: true,
      default: "",
    },
    leetcodeUrl: {
      type: String,
      trim: true,
      default: "",
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Each LeetCode problem number appears exactly once in the global catalog.
problemCatalogSchema.index({ problemNumber: 1 }, { unique: true });

// Text index for title search.
problemCatalogSchema.index({ title: "text" });

module.exports = mongoose.model("ProblemCatalog", problemCatalogSchema);
