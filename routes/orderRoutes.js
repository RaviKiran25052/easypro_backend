const express = require('express');
const multer = require('multer');

const router = express.Router();
const orderController = require('../controllers/orderControllers');
const { protectUser } = require('../middleware/auth');

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware for handling file uploads
const uploadFiles = upload.fields([{ name: 'files', maxCount: 5 }]);

router.route('/')
	.get(protectUser, orderController.getUserOrders)
	.post([protectUser, uploadFiles], orderController.createOrder);

router.route('/:id')
	.get(protectUser, orderController.getOrderById)
// .put(protectUser, orderController.updateOrder)
// .delete(protectUser, orderController.deleteOrder);

module.exports = router;