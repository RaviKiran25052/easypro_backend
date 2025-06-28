const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (role = 'user') => async (req, res, next) => {
	let token;

	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		try {
			token = req.headers.authorization.split(' ')[1];
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			const user = await User.findById(decoded.userId).select('-password');
			if (!user) {
				res.status(404);
				throw new Error('User not found');
			}
			if (role === 'admin') {
				if (user.role !== 'admin') {
					res.status(403);
					throw new Error('Not authorized as an admin');
				}
			}
			req.user = user;
			next();
		} catch (error) {
			console.error(error);
			res.status(401);
			throw new Error('Not authorized, token failed');
		}
	} else {
		res.status(401);
		throw new Error('Not authorized, no token');
	}
};

module.exports = {
	protectUser: protect('user'),
	protectAdmin: protect('admin'),
};