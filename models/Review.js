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
	other: {
		type: Number,
		required: true,
		min: 1,
		max: 5
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
	description: {
		type: String,
		trim: true
	},
	subject: {
		type: String,
		required: true,
		trim: true
	},
	paperType: {
		type: String,
		required: true,
		trim: true
	}
}, {
	timestamps: true
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;