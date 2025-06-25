const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
	subject: {
		type: String,
		required: true,
		trim: true
	},
	paperType: {
		type: String,
		required: true,
		trim: true
	},
	pageCount: {
		type: Number,
		required: true,
		min: 1
	},
	software: {
		type: String,
		trim: true
	},
	type: {
		type: String,
		enum: ['writing', 'editing', 'technical'],
		required: true
	},
	status: {
		type: String,
		enum: ['completed', 'pending', 'unassigned', 'cancel', 'expired'],
		default: 'unassigned'
	},
	files: [{
		type: String
	}],
	instruction: {
		type: String,
		trim: true
	},
	deadline: {
		type: Date,
		required: true
	},
	writer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Writer'
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	}
}, {
	timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;