const express = require('express');
const {
  getCatalog,
  getCatalogTags,
  getCatalogById,
} = require('../controllers/catalogController');

const router = express.Router();

// Filter endpoints must be registered before /:id routes
router.get('/tags', getCatalogTags);

router.get('/', getCatalog);
router.get('/:id', getCatalogById);

module.exports = router;
