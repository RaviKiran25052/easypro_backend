const express = require('express');
const multer = require('multer');

const router = express.Router();
const orderController = require('../controllers/orderControllers');
const { protectUser, protectAdmin, protectBoth } = require('../middleware/auth');

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware for handling file uploads
const uploadFiles = upload.fields([{ name: 'files', maxCount: 5 }]);

router.route('/')
	.get(protectUser, orderController.getUserOrders)
	.post([protectUser, uploadFiles], orderController.createOrder);

router.route('/:id')
	.get(protectBoth, orderController.getOrderById)
	.patch([protectUser, uploadFiles], orderController.updateOrderById);

// admin routes
router.get('/admin/all', protectAdmin, orderController.getAllOrders)
router.patch('/admin/:id/assign', protectAdmin, orderController.assignWriter)
router.patch('/admin/:id/response', [protectAdmin, uploadFiles], orderController.submitResponse)
router.patch('/admin/:id/submit', protectAdmin, orderController.completeOrder)

module.exports = router;