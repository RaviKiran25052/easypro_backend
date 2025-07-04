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
	status: {
		state: {
			type: String,
			enum: ['assigned', 'unassigned', 'pending', 'completed', 'cancelled', 'expired'],
			default: 'unassigned'
		},
		reason: {
			type: String,
			default: '',
			trim: true
		}
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
	responses: [{
		title: {
			type: String,
			trim: true
		},
		url: {
			type: String,
			trim: true
		},
		createdAt: {
			type: Date,
			default: Date.now
		}
	}],		
}, {
	timestamps: true
});

orderSchema.methods.checkAndExpire = async function () {
	const now = new Date();

	// Don't update if already completed, cancelled, or expired
	if (
		this.deadline < now &&
		!['completed', 'cancelled', 'expired'].includes(this.status.state)
	) {
		this.status.state = 'expired';
		this.status.reason = 'Deadline passed';
		await this.save();
	}

	return this;
};

orderSchema.pre('findByIdAndUpdate', function (next) {
	const update = this.getUpdate();
	if (update.deadline) {
		const d = new Date(update.deadline);
		update.deadline = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
		this.setUpdate(update);
	}
	next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;