const express = require('express');

const router = express.Router();
const resourceController = require('../controllers/resourceControllers');

router.get('/', resourceController.test);

module.exports = router;