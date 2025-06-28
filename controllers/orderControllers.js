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

		// Validate required fields based on order type
		const validationResult = validateOrderByType(type, orderRequestData);
		if (!validationResult.isValid) {
			return res.status(400).json({
				success: false,
				message: 'Validation failed',
				errors: validationResult.errors
			});
		}

		// Create order object based on type
		const orderData = buildOrderData(type, orderRequestData);

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

// Validate order data based on type
const validateOrderByType = (type, data) => {
	const errors = [];

	// Common validations
	if (!type || !['writing', 'editing', 'technical'].includes(type)) {
		errors.push('Valid order type is required (writing, editing, technical)');
	}

	if (!data.subject || data.subject.trim() === '') {
		errors.push('Subject is required');
	}

	if (!data.deadline) {
		errors.push('Deadline is required');
	} else {
		const deadlineDate = new Date(data.deadline);
		if (deadlineDate <= new Date()) {
			errors.push('Deadline must be in the future');
		}
	}

	if (!data.user) {
		errors.push('User ID is required');
	}

	// Type-specific validations
	switch (type) {
		case 'writing':
			if (!data.paperType || data.paperType.trim() === '') {
				errors.push('Paper type is required for writing orders');
			}
			if (!data.pageCount || data.pageCount < 1) {
				errors.push('Page count is required and must be at least 1 for writing orders');
			}
			break;

		case 'editing':
			if (!data.files || !Array.isArray(data.files) || data.files.length === 0) {
				errors.push('Files are required for editing orders');
			}
			if (!data.pageCount || data.pageCount < 1) {
				errors.push('Page count is required and must be at least 1 for editing orders');
			}
			break;

		case 'technical':
			if (!data.software || data.software.trim() === '') {
				errors.push('Software specification is required for technical orders');
			}
			if (!data.writerId) {
				errors.push('Writer selection is required for technical orders');
			}
			break;
	}

	return {
		isValid: errors.length === 0,
		errors
	};
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
				writer: data.writerId,
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