const { uploadMultipleFiles } = require('../config/cloudinary');
const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
	try {
		const { type } = req.body;

		// Get user from auth middleware
		const userId = req.user._id;

		// Add user to request body for validation
		const orderRequestData = {
			...req.body,
			user: userId
		};

		// Create order object based on type
		const orderData = buildOrderData(type, orderRequestData);

		if (req.files) {
			try {
				orderData.files = await uploadMultipleFiles(req.files.files, 'easyPro/files');				
			} catch (uploadError) {
				res.status(500);
				throw new Error('Image upload failed');
			}
		}
		// Create and save order
		const order = new Order(orderData);
		await order.save();

		// Populate user reference
		await order.populate('user', 'fullName email');

		res.status(201).json({
			success: true,
			message: 'Order created successfully',
			data: order
		});

	} catch (error) {
		console.error('Error creating order:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: error.message
		});
	}
};

// Build order data object based on type
const buildOrderData = (type, data) => {
	const baseOrder = {
		type,
		subject: data.subject.trim(),
		deadline: new Date(data.deadline),
		user: data.user,
		instruction: data.instruction ? data.instruction.trim() : '',
		files: Array.isArray(data.files) ? data.files : []
	};

	switch (type) {
		case 'writing':
			return {
				...baseOrder,
				paperType: data.paperType.trim(),
				pageCount: parseInt(data.pageCount),
				slides: data.slides ? parseInt(data.slides) : undefined
			};

		case 'editing':
			return {
				...baseOrder,
				pageCount: parseInt(data.pageCount),
				files: data.files // Required for editing
			};

		case 'technical':
			return {
				...baseOrder,
				software: data.software.trim(),
				writer: data.selectedWriter,
				status: 'pending',
				files: Array.isArray(data.files) ? data.files : [] // Optional for technical
			};

		default:
			return baseOrder;
	}
};

// Get all orders for a user
exports.getUserOrders = async (req, res) => {
	try {
		const { userId } = req.params;
		const { status, type, page = 1, limit = 10 } = req.query;

		// Build filter object
		const filter = { user: userId };
		if (status) filter.status = status;
		if (type) filter.type = type;

		// Calculate pagination
		const skip = (page - 1) * limit;

		const orders = await Order.find(filter)
			.populate('user', 'fullName email')
			.populate('writer', 'fullName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit));

		const totalOrders = await Order.countDocuments(filter);

		res.json({
			success: true,
			data: {
				orders,
				pagination: {
					currentPage: parseInt(page),
					totalPages: Math.ceil(totalOrders / limit),
					totalOrders,
					hasNext: page * limit < totalOrders,
					hasPrev: page > 1
				}
			}
		});

	} catch (error) {
		console.error('Error fetching user orders:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: error.message
		});
	}
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
	try {
		const { orderId } = req.params;

		const order = await Order.findById(orderId)
			.populate('user', 'fullName email')
			.populate('writer', 'fullName email');

		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		res.json({
			success: true,
			data: order
		});

	} catch (error) {
		console.error('Error fetching order:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: error.message
		});
	}
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { status } = req.body;

		const validStatuses = ['completed', 'pending', 'unassigned', 'cancel', 'expired'];
		if (!validStatuses.includes(status)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid status value'
			});
		}

		const order = await Order.findByIdAndUpdate(
			orderId,
			{ status },
			{ new: true }
		).populate('user', 'fullName email').populate('writer', 'fullName email');

		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		res.json({
			success: true,
			message: 'Order status updated successfully',
			data: order
		});

	} catch (error) {
		console.error('Error updating order status:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: error.message
		});
	}
};

// Assign writer to order
exports.assignWriter = async (req, res) => {
	try {
		const { orderId } = req.params;
		const { writerId } = req.body;

		const order = await Order.findByIdAndUpdate(
			orderId,
			{
				writer: writerId,
				status: 'pending' // Automatically set to pending when writer is assigned
			},
			{ new: true }
		).populate('user', 'fullName email').populate('writer', 'fullName email');

		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		res.json({
			success: true,
			message: 'Writer assigned successfully',
			data: order
		});

	} catch (error) {
		console.error('Error assigning writer:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: error.message
		});
	}
};