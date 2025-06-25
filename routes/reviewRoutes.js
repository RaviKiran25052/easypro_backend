const express = require('express');

const router = express.Router();
const reviewController = require('../controllers/reviewControllers');

router.get('/', reviewController.test);

module.exports = router;