const { uploadToCloudinary } = require('../config/cloudinary');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
	return jwt.sign({ userId }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN || '7d'
	});
};

// Register controller
exports.register = async (req, res) => {
	try {
		const {
			firstName,
			lastName,
			userName,
			email,
			password,
			gender
		} = req.body;

		// Validate required fields
		if (!firstName || !lastName || !userName || !email || !password || !gender) {
			return res.status(400).json({
				success: false,
				message: 'All required fields must be provided'
			});
		}

		// Check if user already exists
		const existingUser = await User.findOne({
			$or: [{ email }, { userName }]
		});

		if (existingUser) {
			return res.status(409).json({
				success: false,
				message: existingUser.email === email
					? 'Email already registered'
					: 'Username already taken'
			});
		}

		// Validate password length
		if (password.length < 6) {
			return res.status(400).json({
				success: false,
				message: 'Password must be at least 6 characters long'
			});
		}

		// Create new user
		const userData = {
			firstName,
			lastName,
			userName,
			email,
			password,
			gender
		};

		if (req.file) {
			try {
				userData.profilePic = await uploadToCloudinary(req.file, 'easyPro/images');
			} catch (uploadError) {
				res.status(500).json({
					success: false,
					message: 'Failed to upload profile picture'
				});
			}
		}

		const user = new User(userData);
		await user.save();

		// Generate token
		const token = generateToken(user._id);

		// Remove password from response
		const userResponse = user.toObject();
		delete userResponse.password;

		res.status(201).json({
			success: true,
			message: 'User registered successfully',
			data: {
				user: userResponse,
				token
			}
		});

	} catch (error) {
		console.error('Registration error:', error);

		// Handle validation errors
		if (error.name === 'ValidationError') {
			const errors = Object.values(error.errors).map(err => err.message);
			return res.status(400).json({
				success: false,
				message: 'Validation error',
				errors
			});
		}

		// Handle duplicate key errors
		if (error.code === 11000) {
			const field = Object.keys(error.keyValue)[0];
			return res.status(409).json({
				success: false,
				message: `${field} already exists`
			});
		}

		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
};

exports.login = async (req, res) => {
	try {
		const { email, userName, password } = req.body;

		// Validate required fields
		if ((!email && !userName) || !password) {
			return res.status(400).json({
				success: false,
				message: 'Email/username and password are required'
			});
		}

		// Find user by email or username
		const query = email ? { email } : { userName };
		const user = await User.findOne(query);

		if (!user) {
			return res.status(200).json({
				success: false,
				message: 'Invalid credentials'
			});
		}

		// Check password
		const isPasswordValid = await user.comparePassword(password);

		if (!isPasswordValid) {
			return res.status(401).json({
				success: false,
				message: 'Invalid credentials'
			});
		}

		// Generate token
		const token = generateToken(user._id);

		// Remove password from response
		const userResponse = user.toObject();
		delete userResponse.password;

		res.status(200).json({
			success: true,
			message: 'Login successful',
			data: {
				user: userResponse,
				token
			},
			role: userResponse.role || 'user'
		});

	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
};