const express = require('express');
const {
  getAllRevisions,
  completeRevision,
} = require('../controllers/revisionController');

const router = express.Router();

router.get('/', getAllRevisions);
router.patch('/:id/complete', completeRevision);

module.exports = router;
