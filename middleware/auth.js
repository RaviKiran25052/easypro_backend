const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (roles = ['user']) => async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ message: 'Not authorized, no token' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const user = await User.findById(decoded.userId).select('-password');
		if (!user) {
			return res.status(401).json({ message: 'User not found' });
		}

		// Attach user to request
		req.user = user;

		// Check if user's role is included in the allowed roles
		if (!roles.includes(user.role)) {
			return res.status(403).json({ message: 'Forbidden: insufficient role' });
		}

		next();

	} catch (error) {
		console.error('Auth error:', error.message);
		res.status(401).json({ message: 'Not authorized, token failed' });
	}
};

module.exports = {
	protectUser: protect(['user']),
	protectAdmin: protect(['admin']),
	protectBoth: protect(['user', 'admin'])
};