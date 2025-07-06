const Writer = require('../models/Writer');
const { uploadToCloudinary } = require('../config/cloudinary');
const Review = require('../models/Review');

exports.getAllWriters = async (req, res) => {
	try {
		const { subject, deadline } = req.query;
		const query = {};

		// Handle subject filtering
		if (subject) {
			query.$or = [
				{ skills: { $elemMatch: { skill: new RegExp(subject, 'i') } } },
				{ familiarWith: { $in: [new RegExp(subject, 'i')] } }
			];
		}

		// Handle deadline filtering
		if (deadline) {
			const deadlineDate = new Date(deadline);

			// Check if deadline is valid
			if (isNaN(deadlineDate.getTime())) {
				return res.status(400).json({
					success: false,
					message: 'Invalid deadline format'
				});
			}

			// Check if deadline is in the past
			if (deadlineDate < new Date()) {
				return res.status(400).json({
					success: false,
					message: 'Deadline cannot be in the past'
				});
			}

			// Find writers available on or before the deadline, or those with no availability restriction
			query.$and = query.$and || [];
			query.$and.push({
				$or: [
					{ availableOn: { $lte: deadlineDate } },
					{ availableOn: { $exists: false } },
					{ availableOn: null }
				]
			});
		}

		const writers = await Writer.find(query).sort({ createdAt: -1 });

		if (!writers || writers.length === 0) {
			return res.status(200).json({
				success: true,
				message: 'No writers found',
				data: []
			});
		}

		res.status(200).json({
			success: true,
			data: writers
		});

	} catch (error) {
		console.error('Error fetching writers:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
};

exports.getWriterById = async (req, res) => {
	const { id } = req.params;
	const writer = await Writer.findById(id);
	if (!writer) {
		return res.status(404).json({
			success: false,
			message: 'Writer not found'
		});
	}

	const reviews = await Review.find({ writer: id })
		.populate('user', 'userName email')
		.populate('order', 'type paperType subject ')
		.sort({ createdAt: -1 });

	res.status(200).json({
		success: true,
		writer,
		reviews
	});
}

exports.createWriter = async (req, res) => {
	try {
		const { fullName, email, skills, familiarWith, education, bio } = req.body;
		if (!fullName || !email || !skills || !familiarWith || !education || !bio) {
			return res.status(400).json({
				success: false,
				message: 'All fields are required'
			});
		}

		// Check if writer already exists
		const existingWriter = await Writer.findOne({
			$or: [{ email }, { fullName }]
		});

		if (existingWriter) {
			return res.status(409).json({
				success: false,
				message: existingWriter.email === email
					? 'Email already registered'
					: 'Writer with this name already exists'
			});
		}

		const writerData = {
			fullName,
			email,
			skills: skills.map(skill => ({
				skill: skill.skill,
				experience: skill.experience
			})),
			familiarWith: familiarWith.filter(item => item.trim() !== ''),
			education: education.map(edu => ({
				qualification: edu.qualification,
				place: edu.place,
				startYear: edu.startYear,
				endYear: edu.endYear,
				grade: edu.grade
			})),
			bio
		};

		if (req.file) {
			try {
				writerData.profilePic = await uploadToCloudinary(req.file, 'easyPro/images');
			} catch (uploadError) {
				return res.status(500).json({
					success: false,
					message: 'Failed to upload profile picture'
				});
			}
		}
		const newWriter = await Writer.create(writerData);
		res.status(201).json({
			success: true,
			message: 'Writer created successfully',
			data: newWriter
		});
	} catch (error) {
		console.error('Error creating writer:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
}

exports.updateWriter = async (req, res) => {
	try {
		const { id } = req.params;
		const { fullName, email, skills, familiarWith, education, bio } = req.body;

		const writer = await Writer.findById(id);
		if (!writer) {
			return res.status(404).json({
				success: false,
				message: 'Writer not found'
			});
		}

		// Create update object with only provided fields
		const updateData = {};

		// Only update fields that are provided in the request
		if (fullName !== undefined) updateData.fullName = fullName;
		if (email !== undefined) updateData.email = email;
		if (bio !== undefined) updateData.bio = bio;

		// Handle array fields with proper validation
		if (skills !== undefined) {
			if (Array.isArray(skills)) {
				updateData.skills = skills.map(skill => ({
					skill: skill.skill,
					experience: skill.experience
				}));
			}
		}

		if (familiarWith !== undefined) {
			if (Array.isArray(familiarWith)) {
				updateData.familiarWith = familiarWith.filter(item => item.trim() !== '');
			}
		}

		if (education !== undefined) {
			if (Array.isArray(education)) {
				updateData.education = education.map(edu => ({
					qualification: edu.qualification,
					place: edu.place,
					startYear: edu.startYear,
					endYear: edu.endYear,
					grade: edu.grade
				}));
			}
		}

		// Handle file upload if present
		if (req.file) {
			try {
				updateData.profilePic = await uploadToCloudinary(req.file, 'easyPro/images');
			} catch (uploadError) {
				return res.status(500).json({
					success: false,
					message: 'Failed to upload profile picture'
				});
			}
		}

		// Update only if there are fields to update
		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({
				success: false,
				message: 'No fields provided to update'
			});
		}

		// Use findByIdAndUpdate with new option to return updated document
		const updatedWriter = await Writer.findByIdAndUpdate(
			id,
			updateData,
			{
				new: true,
				runValidators: true // Ensure schema validation runs
			}
		);

		res.status(200).json({
			success: true,
			message: 'Writer updated successfully',
			data: updatedWriter
		});

	} catch (error) {
		console.error('Error updating writer:', error);

		// Handle validation errors
		if (error.name === 'ValidationError') {
			return res.status(400).json({
				success: false,
				message: 'Validation error',
				errors: Object.values(error.errors).map(err => err.message)
			});
		}

		// Handle duplicate key error (email uniqueness)
		if (error.code === 11000) {
			return res.status(400).json({
				success: false,
				message: 'Email already exists'
			});
		}

		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
}

exports.deleteWriter = async (req, res) => {
	try {
		const { id } = req.params;
		const writer = await Writer.findByIdAndDelete(id);
		if (!writer) {
			return res.status(404).json({
				success: false,
				message: 'Writer not found'
			});
		}
		res.status(200).json({
			success: true,
			message: 'Writer deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting writer:', error);
		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
}