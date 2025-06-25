const express = require('express');

const router = express.Router();
const writerController = require('../controllers/writerControllers');

router.get('/', writerController.test);

module.exports = router;