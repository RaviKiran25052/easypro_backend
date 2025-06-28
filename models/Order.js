const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
	type: {
		type: String,
		enum: ['writing', 'editing', 'technical'],
		required: true
	},
	paperType: {
		type: String,
		trim: true
	},
	subject: {
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
	slides: {
		type: Number
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
	},
	status: {
		type: String,
		enum: ['completed', 'pending', 'unassigned', 'cancel', 'expired'],
		default: 'unassigned'
	},
}, {
	timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;