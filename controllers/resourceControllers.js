const { default: mongoose } = require('mongoose');
const { uploadToCloudinary } = require('../config/cloudinary');
const Resource = require('../models/Resource');
const Writer = require('../models/Writer');

exports.getResources = async (req, res) => {
	try {
		const {
			search,
			type,
			subject,
			sort = 'createdAt',
			order = 'desc',
			page = 1,
			limit = 12
		} = req.query;

		// Build the query
		let query = {};

		// Search functionality (title, subject, tags, author name)
		if (search) {
			const writers = await Writer.find({
				$or: [
					{ fullName: { $regex: search, $options: 'i' } },
					{ email: { $regex: search, $options: 'i' } }
				]
			}).select('_id');

			query.$or = [
				{ title: { $regex: search, $options: 'i' } },
				{ subject: { $regex: search, $options: 'i' } },
				{ tags: { $regex: search, $options: 'i' } },
				{ author: { $in: writers.map(w => w._id) } }
			];
		}

		// Filter by type
		if (type) {
			query.type = { $regex: type, $options: 'i' };
		}

		// Filter by subject
		if (subject) {
			query.subject = { $regex: subject, $options: 'i' };
		}

		// Sorting
		const sortOptions = {};
		sortOptions[sort] = order === 'asc' ? 1 : -1;

		// Pagination
		const pageNumber = parseInt(page);
		const limitNumber = parseInt(limit);
		const skip = (pageNumber - 1) * limitNumber;

		// Get total count for pagination
		const totalCount = await Resource.countDocuments(query);

		// Get resources with author population
		const resources = await Resource.find(query)
			.populate({
				path: 'author',
				select: 'fullName email profilePic rating'
			})
			.sort(sortOptions)
			.skip(skip)
			.limit(limitNumber);

		res.status(200).json({
			success: true,
			count: resources.length,
			totalCount,
			resources
		});

	} catch (error) {
		console.error('Error fetching resources:', error);
		res.status(500).json({
			success: false,
			message: 'Server error while fetching resources'
		});
	}
};

exports.createResource = async (req, res) => {
	try {
		const { title, subject, description, type, tags, author } = req.body;

		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'File upload is required'
			});
		}

		// Upload file to cloudinary
		const fileUrl = await uploadToCloudinary(req.file, 'easyPro/resources');

		// Create resource
		const resource = await Resource.create({
			title,
			subject,
			description,
			type,
			tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
			url: fileUrl,
			author
		});

		res.status(201).json({
			success: true,
			resource
		});

	} catch (error) {
		console.error('Error creating resource:', error);
		res.status(500).json({
			success: false,
			message: 'Server error while creating resource'
		});
	}
};

exports.getResourceById = async (req, res) => {
	try {
		const { id } = req.params;

		// Validate if the ID is a valid MongoDB ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid resource ID format'
			});
		}

		// Find the resource by ID and populate the author details
		const resource = await Resource.findById(id)
			.populate('author', 'fullName email profilePic skills familiarWith education bio rating')
			.exec();

		// Check if resource exists
		if (!resource) {
			return res.status(404).json({
				success: false,
				message: 'Resource not found'
			});
		}

		// Increment views count
		resource.views += 1;
		await resource.save();

		// Send successful response
		res.status(200).json({
			success: true,
			data: resource,
			message: 'Resource fetched successfully'
		});

	} catch (error) {
		console.error('Error fetching resource:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error',
			error: process.env.NODE_ENV === 'development' ? error.message : undefined
		});
	}
};

exports.updateResourceById = async (req, res) => {
	try {
		const { id } = req.params;
		const { title, subject, description, type, tags } = req.body;

		const updateData = {
			title,
			subject,
			description,
			type,
			tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())
		};

		// If new file is uploaded, update the URL
		if (req.file) {
			const fileUrl = await uploadToCloudinary(req.file, 'easyPro/resources');
			updateData.url = fileUrl;
		}

		const updatedResource = await Resource.findByIdAndUpdate(
			id,
			updateData,
			{ new: true, runValidators: true }
		).populate('author');

		if (!updatedResource) {
			return res.status(404).json({
				success: false,
				message: 'Resource not found'
			});
		}

		res.status(200).json({
			success: true,
			resource: updatedResource
		});

	} catch (error) {
		console.error('Error updating resource:', error);
		res.status(500).json({
			success: false,
			message: 'Server error while updating resource'
		});
	}
};

exports.deleteResourceById = async (req, res) => {
	try {
		const { id } = req.params;

		// Verify the resource exists
		const resource = await Resource.findById(id);
		if (!resource) {
			return res.status(404).json({
				success: false,
				message: 'Resource not found'
			});
		}

		// Delete the resource
		await Resource.findByIdAndDelete(id);

		res.status(200).json({
			success: true,
			message: 'Resource deleted successfully'
		});

	} catch (error) {
		console.error('Error deleting resource:', error);
		res.status(500).json({
			success: false,
			message: 'Server error while deleting resource'
		});
	}
};