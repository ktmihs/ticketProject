const express = require('express');
const router = express.Router();
const showController = require('../controllers/show.controller');

// GET /shows
router.get('/', showController.getShows);

// GET /shows/:showId
router.get('/:showId', showController.getShowById);

module.exports = router;
