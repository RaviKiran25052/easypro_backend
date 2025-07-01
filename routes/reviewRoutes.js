const express = require('express');

const router = express.Router();
const reviewController = require('../controllers/reviewControllers');
const { protectUser } = require('../middleware/auth');

router.route('/')
	.get(protectUser, reviewController.test)
	.post(protectUser, reviewController.createReview);

module.exports = router;