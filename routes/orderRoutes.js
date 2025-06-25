const express = require('express');

const router = express.Router();
const orderController = require('../controllers/orderControllers');

router.get('/', orderController.test);

module.exports = router;