const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (file, folder) => {
	const fileBuffer = file.buffer;
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{ resource_type: 'auto', folder },
			(error, result) => {
				if (error) reject(error);
				else resolve(result.secure_url);
			}
		);

		uploadStream.end(fileBuffer);
	});
};

const uploadMultipleFiles = async (files, folder) => {
	if (!files || files.length === 0) return [];

	const uploadPromises = files.map(file =>
		uploadToCloudinary(file, folder)
	);

	return Promise.all(uploadPromises);
};

module.exports = {
	uploadToCloudinary,
	uploadMultipleFiles
};