const mongoose = require('mongoose');

const writerSchema = new mongoose.Schema({
	fullName: {
		type: String,
		required: true,
		trim: true
	},
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true
	},
	profilePic: {
		type: String,
		default: 'https://thumbs.dreamstime.com/b/user-profile-icon-flat-vector-illustration-design-user-profile-icon-flat-vector-illustration-design-isolated-white-background-158416637.jpg'
	},
	skills: [{
		skill: {
			type: String,
			required: true,
			trim: true
		},
		experience: {
			type: Number,
			required: true,
			min: 0
		}
	}],
	familiarWith: [{
		type: String,
		trim: true
	}],
	education: [{
		qualification: {
			type: String,
			required: true,
			trim: true
		},
		place: {
			type: String,
			required: true,
			trim: true
		},
		startYear: {
			type: Number,
			required: true
		},
		endYear: {
			type: Number,
			required: true
		},
		grade: {
			type: String,
			trim: true
		}
	}],
	bio: {
		type: String,
		trim: true
	},
	rating: {
		avgRating: {
			type: Number,
			default: 0,
			min: 0,
			max: 5
		},
		count: {
			type: Number,
			default: 0,
		}
	},
	maxOrders: {
		type: Number,
		default: 5,
		min: 1
	},
	ordersLeft: {
		type: Number,
		default: 5
	},
	availableOn: {
		type: Date,
		default: null
	}
}, {
	timestamps: true
});

const Writer = mongoose.model('Writer', writerSchema);
module.exports = Writer;