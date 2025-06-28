const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
	link: {
		type: String,
		required: true,
		trim: true
	},
	title: {
		type: String,
		required: true,
		trim: true
	},
	description: {
		type: String,
		required: true,
		trim: true
	},
	type: {
		type: String,
		enum: ['image', 'video', 'pdf', 'presentation', 'other'],
		required: true,
		trim: true
	},
	tags: [{
		type: String,
		trim: true
	}],
	writer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Writer',
		required: true
	}
}, {
	timestamps: true
});

const Resource = mongoose.model('Resource', resourceSchema);
module.exports = Resource;