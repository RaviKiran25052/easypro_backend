const express = require('express');

const router = express.Router();
const orderController = require('../controllers/orderControllers');
const { protectUser } = require('../middleware/auth');

router.route('/')
	.get(protectUser, orderController.getOrders)
	.post(protectUser, orderController.createOrder);

router.route('/:id')
	.get(protectUser, orderController.getOrderById)
	// .put(protectUser, orderController.updateOrder)
	// .delete(protectUser, orderController.deleteOrder);

module.exports = router;