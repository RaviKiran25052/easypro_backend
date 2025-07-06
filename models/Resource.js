const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		trim: true
	},
	subject: {
		type: String,
		required: true,
		trim: true
	},
	description: {
		type: String,
		required: true,
		trim: true
	},
	url: {
		type: String,
		required: true,
		trim: true
	},
	type: {
		type: String,
		required: true,
		trim: true
	},
	tags: [{
		type: String,
		trim: true
	}],
	views: {
		type: Number,
		default: 0
	},
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Writer',
		required: true
	}
}, {
	timestamps: true
});

const Resource = mongoose.model('Resource', resourceSchema);
module.exports = Resource;