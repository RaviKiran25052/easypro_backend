const User = require("../models/User");

const createAdminIfNotExists = async () => {
	try {
		// Check if admin already exists
		const existingAdmin = await User.findOne({
			$or: [
				{ email: process.env.ADMIN_EMAIL },
				{ userName: process.env.ADMIN_USERNAME }
			]
		});

		if (existingAdmin) {
			console.log('Admin user already exists');
			return;
		}

		// Create admin user
		const adminUser = new User({
			firstName: 'Admin',
			lastName: 'Profile',
			userName: process.env.ADMIN_USERNAME,
			email: process.env.ADMIN_EMAIL,
			profilePic: 'https://img.freepik.com/premium-vector/shopping-human-simple-gold-icon-apps-websites_599062-10425.jpg',
			gender: 'male',
			password: process.env.ADMIN_PASSWORD,
			role: 'admin'
		});

		// Save to database
		await adminUser.save();

		console.log('Admin user created successfully');
	} catch (error) {
		console.error('Error creating admin user:', error);
	}
}

module.exports = createAdminIfNotExists;