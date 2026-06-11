const express = require('express');
const {
  addProblem,
  getMyProblems,
  getMyProblemById,
  updateNotes,
  solveProblem,
  deleteUserProblem,
} = require('../controllers/userProblemController');

const router = express.Router();

router.post('/', addProblem);
router.get('/', getMyProblems);
router.get('/:id', getMyProblemById);
router.patch('/:id/notes', updateNotes);
router.patch('/:id/solve', solveProblem);
router.delete('/:id', deleteUserProblem);

module.exports = router;
