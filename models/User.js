const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
	firstName: {
		type: String,
		required: true,
		trim: true
	},
	lastName: {
		type: String,
		required: true,
		trim: true
	},
	userName: {
		type: String,
		required: true,
		unique: true,
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
	gender: {
		type: String,
		enum: ['male', 'female', 'other'],
		required: true
	},
	password: {
		type: String,
		required: true,
		minlength: 6
	},
	role: {
		type: String,
		enum: ["user", "admin"],
		default: "user"
	}
}, {
	timestamps: true
});

// Password hashing middleware
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	try {
		const salt = await bcrypt.genSalt(12);
		this.password = await bcrypt.hash(this.password, salt);
		next();
	} catch (err) {
		next(err);
	}
});

// Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword) {
	return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;