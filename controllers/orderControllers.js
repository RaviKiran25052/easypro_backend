const { uploadMultipleFiles } = require('../config/cloudinary');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Writer = require('../models/Writer');

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
		if (order.type === 'technical') {
			const writer = await Writer.findById(order.writer);

			if (!writer) {
				return res.status(404).json({
					success: false,
					message: 'Writer not found'
				});
			}

			// Check writer availability
			let availabilityMessage = '';
			let canAssign = true;

			// Check order capacity
			if (writer.ordersLeft <= 0) {
				canAssign = false;
				availabilityMessage = 'Writer has no available slots';
			}

			// Check availability date if set
			if (writer.availableOn) {
				const availableDate = new Date(writer.availableOn);
				if (availableDate > order.deadline) {
					canAssign = false;
					availabilityMessage = `Writer will be available on ${availableDate.toLocaleDateString()} - after order deadline`;
				}
			}

			if (!canAssign) {
				return res.status(400).json({
					success: false,
					message: 'Cannot assign writer',
					details: availabilityMessage,
					writerStatus: {
						ordersLeft: writer.ordersLeft,
						availableOn: writer.availableOn
					}
				});
			}

			// Update writer's orders left count
			const ordersLeft = Math.max(0, writer.ordersLeft - 1);
			writer.ordersLeft = ordersLeft;
			if (ordersLeft === 0) {
				writer.availableOn = order.deadline;
			}
			await writer.save();
		}
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
		subject: data.subject?.trim(),
		deadline: data.deadline ? new Date(data.deadline) : undefined,
		user: data.user,
		instruction: data.instruction ? data.instruction?.trim() : '',
		files: Array.isArray(data.files) ? data.files : []
	}
	switch (type) {
		case 'writing':
			return {
				...baseOrder,
				paperType: data.paperType?.trim(),
				pageCount: parseInt(data?.pageCount) || 1,
				slides: data.slides ? parseInt(data.slides) : undefined,
				status: data.status || {
					state: 'unassigned',
					reason: ''
				}
			};

		case 'editing':
			return {
				...baseOrder,
				pageCount: parseInt(data?.pageCount) || 1,
				files: data?.files,
				status: data.status || {
					state: 'unassigned',
					reason: ''
				}
			};

		case 'technical':
			return {
				...baseOrder,
				software: data.software?.trim(),
				writer: data.selectedWriter,
				status: data.status || {
					state: 'pending',
					reason: ''
				},
				files: Array.isArray(data.files) ? data.files : [] // Optional for technical
			};

		default:
			return baseOrder;
	}
};

// Get all orders for a user
exports.getUserOrders = async (req, res) => {
	try {
		const userId = req.user._id;
		const { status, type, page = 1, limit = 10 } = req.query;

		// Build filter object
		const filter = { user: userId };
		if (status) filter['status.state'] = status;
		if (type) filter.type = type;

		// Calculate pagination
		const skip = (page - 1) * limit;

		const orders = await Order.find(filter)
			.populate('user', 'fullName email')
			.populate('writer', 'fullName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit));

		// Fetch review details for completed orders
		const ordersWithReviews = await Promise.all(
			orders.map(async (order) => {
				await order.checkAndExpire();
				const orderObj = order.toObject();

				// Only fetch review data if order status is completed
				if (order.status.state === 'completed') {
					const review = await Review.findOne({ order: order._id })
						.populate('writer', 'fullName email')
						.populate('user', 'fullName email');

					orderObj.review = review;
				}

				return orderObj;
			})
		);

		const totalOrders = await Order.countDocuments(filter);

		res.json({
			success: true,
			data: {
				orders: ordersWithReviews,
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
		const { id } = req.params;

		const order = await Order.findById(id)
			.populate('user', 'fullName email')
			.populate('writer', 'fullName email profilePic skills rating ordersLeft availableOn');

		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		await order.checkAndExpire();

		let orderObj = order.toObject();
		// Fetch review details for completed orders
		if (order.status.state === 'completed') {
			const review = await Review.findOne({ order: order._id })
				.populate('writer', 'fullName email')
				.populate('user', 'fullName email');

			orderObj.review = review || null;;
		}

		res.json({
			success: true,
			data: orderObj
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

// Update order by ID
exports.updateOrderById = async (req, res) => {
	try {
		const userId = req.user._id;
		const { id } = req.params;

		// Find the order and check if it belongs to the user
		const existingOrder = await Order.findOne({ _id: id, user: userId });

		if (!existingOrder) {
			return res.status(404).json({
				success: false,
				message: 'Order not found or you do not have permission to update this order'
			});
		}

		// Get the order type from existing order (type cannot be changed)
		const orderType = existingOrder.type;

		// Build the update data based on the existing order type
		const updateData = buildOrderData(orderType, {
			...req.body,
			user: userId // Ensure user remains the same
		});

		// Remove the type field from updates since it shouldn't change
		delete updateData.type;

		// Handle file updates
		let finalFiles = existingOrder.files || [];

		// If files field is provided in request body, it contains the remaining files after user deletions
		if (req.body.files !== undefined) {
			// Use the files from request body (user may have deleted some existing files)
			finalFiles = Array.isArray(req.body.files) ? req.body.files : [];
		}

		// If new files are uploaded, upload them to cloudinary and append to existing files
		if (req.files && req.files.files) {
			try {
				const newUploadedFiles = await uploadMultipleFiles(req.files.files, 'easyPro/files');
				finalFiles = [...finalFiles, ...newUploadedFiles];
			} catch (uploadError) {
				return res.status(500).json({
					success: false,
					message: 'File upload failed'
				});
			}
		}

		// Update the files in updateData
		updateData.files = finalFiles;

		// Remove undefined values to avoid overwriting existing data with undefined
		Object.keys(updateData).forEach(key => {
			if (updateData[key] === undefined) {
				delete updateData[key];
			}
		});

		// If no valid updates are provided after processing
		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: 'No valid fields provided for update'
			});
		}

		// Validate deadline if being updated
		if (updateData.deadline) {
			if (updateData.deadline < new Date()) {
				return res.status(400).json({
					success: false,
					message: 'Deadline cannot be in the past'
				});
			}
		}

		// Validate pageCount if being updated (for writing and editing types)
		if (updateData.pageCount && updateData.pageCount < 1) {
			return res.status(400).json({
				success: false,
				message: 'Page count must be at least 1'
			});
		}

		// Type-specific validations
		if (orderType === 'technical' && req.body?.status?.state === 'cancelled') {
			const writer = await Writer.findById(existingOrder.writer);

			if (!writer) {
				return res.status(404).json({
					success: false,
					message: 'Writer not found'
				});
			}

			// Reverse the previous assignment logic
			writer.ordersLeft += 1;  // Increment the available slots
			// reset availableOn
			writer.availableOn = null;

			await writer.save();
		}
		if (orderType === 'editing' && updateData.files && updateData.files.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'Files are required for editing orders'
			});
		}

		if (orderType === 'writing' && updateData.paperType && !updateData.paperType.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Paper type is required for writing orders'
			});
		}

		// Handle nested status updates properly
		if (updateData.status) {
			const statusUpdate = {};

			if (updateData.status.state) {
				statusUpdate['status.state'] = updateData.status.state;
			}
			if (updateData.status.reason !== undefined) {
				statusUpdate['status.reason'] = updateData.status.reason;
			}

			// Replace the nested status object with flattened updates
			delete updateData.status;
			Object.assign(updateData, statusUpdate);
		}

		// Update the order
		const updatedOrder = await Order.findByIdAndUpdate(
			id,
			{ $set: updateData },
			{
				new: true,
				runValidators: true
			}
		).populate('writer', 'name email')
			.populate('user', 'name email');

		res.status(200).json({
			success: true,
			message: 'Order updated successfully',
			data: updatedOrder
		});

	} catch (error) {
		console.error('Error updating order:', error);

		// Handle validation errors
		if (error.name === 'ValidationError') {
			const validationErrors = Object.values(error.errors).map(err => err.message);
			return res.status(400).json({
				success: false,
				message: 'Validation error',
				errors: validationErrors
			});
		}

		// Handle cast errors (invalid ObjectId)
		if (error.name === 'CastError') {
			return res.status(400).json({
				success: false,
				message: 'Invalid order ID format'
			});
		}

		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
};

exports.getAllOrders = async (req, res) => {
	try {
		const { status, type, page = 1, limit = 10 } = req.query;

		// Build filter object
		const filter = {};
		if (status) filter['status.state'] = status;
		if (type) filter.type = type;

		// Calculate pagination
		const skip = (page - 1) * limit;

		const orders = await Order.find(filter)
			.populate('user', 'fullName email')
			.populate('writer', 'fullName email')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(parseInt(limit));

		// Fetch review details for completed orders
		const ordersWithReviews = await Promise.all(
			orders.map(async (order) => {
				await order.checkAndExpire();
				const orderObj = order.toObject();

				// Only fetch review data if order status is completed
				if (order.status.state === 'completed') {
					const review = await Review.findOne({ order: order._id })
						.populate('writer', 'fullName email')
						.populate('user', 'fullName email');

					orderObj.review = review;
				}

				return orderObj;
			})
		);

		const totalOrders = await Order.countDocuments(filter);

		res.json({
			success: true,
			data: {
				orders: ordersWithReviews,
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
}

exports.assignWriter = async (req, res) => {
	try {
		const { id } = req.params;
		const { writerId } = req.body;

		// Validate input
		if (!writerId) {
			return res.status(400).json({
				success: false,
				message: 'Writer ID is required'
			});
		}

		// Find the order
		const order = await Order.findById(id);
		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		// Check if order can be assigned
		if (!['unassigned', 'pending'].includes(order.status.state)) {
			return res.status(400).json({
				success: false,
				message: `Cannot assign writer to ${order.status.state} order`
			});
		}

		// Find the writer
		const writer = await Writer.findById(writerId);
		if (!writer) {
			return res.status(404).json({
				success: false,
				message: 'Writer not found'
			});
		}

		// Check writer availability
		let availabilityMessage = '';
		let canAssign = true;

		// Check order capacity
		if (writer.ordersLeft <= 0) {
			canAssign = false;
			availabilityMessage = 'Writer has no available slots';
		}

		// Check availability date if set
		if (writer.availableOn) {
			const availableDate = new Date(writer.availableOn);
			if (availableDate > order.deadline) {
				canAssign = false;
				availabilityMessage = `Writer will be available on ${availableDate.toLocaleDateString()} - after order deadline`;
			}
		}

		if (!canAssign) {
			return res.status(400).json({
				success: false,
				message: 'Cannot assign writer',
				details: availabilityMessage,
				writerStatus: {
					ordersLeft: writer.ordersLeft,
					availableOn: writer.availableOn
				}
			});
		}

		// Update the order
		order.writer = writerId;
		order.status.state = 'assigned';
		order.status.reason = `Assigned by admin on ${new Date().toLocaleDateString()}`;

		// Update writer's orders left count
		const ordersLeft = Math.max(0, writer.ordersLeft - 1);
		writer.ordersLeft = ordersLeft;
		if (ordersLeft === 0) {
			writer.availableOn = order.deadline;
		}

		// Save changes
		await Promise.all([order.save(), writer.save()]);

		// Populate writer details in the response
		const updatedOrder = await Order.findById(id)
			.populate('writer', 'fullName email rating ordersLeft availableOn');

		res.json({
			success: true,
			message: 'Writer assigned successfully',
			data: updatedOrder
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

exports.submitResponse = async (req, res) => {
	try {
		const { id } = req.params;
		const titles = req.body?.titles?.split(','); // Array of file titles 
		const files = req.files?.files;

		// Validate inputs
		if (!files || !titles || files.length !== titles.length) {
			return res.status(400).json({
				success: false,
				message: 'Files and types arrays must be provided and have matching lengths'
			});
		}

		// Find the order
		const order = await Order.findById(id);
		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		// Check if order can receive responses
		if (!['assigned', 'pending'].includes(order.status.state)) {
			return res.status(400).json({
				success: false,
				message: `Cannot add responses to ${order.status.state} order`
			});
		}

		const cloudinaryResults = await uploadMultipleFiles(files, 'easyPro/responses');

		// Create response objects
		const newResponses = cloudinaryResults.map((link, index) => ({
			title: titles[index],
			url: link
		}));

		// Update order with new responses
		order.responses = [...order.responses, ...newResponses];
		await order.save();

		res.status(200).json({
			success: true,
			message: 'Files uploaded successfully',
			data: {
				responses: newResponses,
				orderId: order._id,
				status: order.status.state
			}
		});

	} catch (error) {
		console.error('Error uploading order responses:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to upload files',
			error: error.message
		});
	}
};

exports.completeOrder = async (req, res) => {
	try {
		const { id } = req.params;

		// Find and validate the order
		const order = await Order.findById(id).populate('writer');
		if (!order) {
			return res.status(404).json({
				success: false,
				message: 'Order not found'
			});
		}

		// Check if order can be completed
		if (!['assigned', 'pending'].includes(order.status.state)) {
			return res.status(400).json({
				success: false,
				message: `Cannot complete order with status: ${order.status.state}`
			});
		}

		// Verify writer exists
		if (!order.writer) {
			return res.status(400).json({
				success: false,
				message: 'No writer assigned to this order'
			});
		}

		// Update order status
		order.status = {
			state: 'completed',
			reason: `Completed by ${order.writer?.fullName}`,
			completedAt: new Date()
		};

		// Update writer's orders
		const writer = await Writer.findById(order.writer._id);
		writer.ordersLeft = Math.min(writer.ordersLeft + 1, writer.maxOrders);

		// If writer has reached max capacity (last order completed)
		if (writer.ordersLeft === writer.maxOrders) {
			writer.availableOn = null; // Make writer immediately available
		}

		await Promise.all([order.save(), writer.save()]);

		// Get updated order with populated writer
		const updatedOrder = await Order.findById(id)
			.populate('writer', 'fullName email ordersLeft maxOrders availableOn');

		res.json({
			success: true,
			message: 'Order marked as completed',
			data: updatedOrder
		});

	} catch (error) {
		console.error('Error completing order:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: error.message
		});
	}
};