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
			{
				resource_type: 'auto',
				folder,
				context: `filename=${file.originalname}`, // Store original name in metadata
				use_filename: true,       // Use original filename as part of Cloudinary's ID
				unique_filename: false    // Don't add unique suffixes
			},
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