const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
	followingInstructions: {
		type: Number,
		required: true,
		min: 1,
		max: 5
	},
	grammar: {
		type: Number,
		required: true,
		min: 1,
		max: 5
	},
	responseSpeed: {
		type: Number,
		required: true,
		min: 1,
		max: 5
	},
	formatting: {
		type: Number,
		required: true,
		min: 1,
		max: 5
	},
	other: [{
		name: {
			type: String,
			trim: true
		},
		rating: {
			type: Number,
			min: 1,
			max: 5
		}
	}],
	description: {
		type: String,
		trim: true
	},
	writer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Writer',
		required: true
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	order: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Order',
		required: true
	}
}, {
	timestamps: true
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;