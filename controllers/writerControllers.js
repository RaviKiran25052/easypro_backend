const Writer = require('../models/Writer');
const { uploadToCloudinary } = require('../config/cloudinary');

exports.getAllWriters = async (req, res) => {
	const writers = await Writer.find({}).sort({ createdAt: -1 });
	if (!writers || writers.length === 0) {
		return res.status(200).json({
			success: false,
			message: 'No writers found'
		});
	}
	res.status(200).json({
		success: true,
		data: writers
	});
}

exports.getWriterById = async (req, res) => {
	const { id } = req.params;
	const writer = await Writer.findById(id);
	if (!writer) {
		return res.status(404).json({
			success: false,
			message: 'Writer not found'
		});
	}
	res.status(200).json({
		success: true,
		data: writer
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

		if (!fullName || !email || !skills || !familiarWith || !education || !bio) {
			return res.status(400).json({
				success: false,
				message: 'All fields are required'
			});
		}

		const writer = await Writer.findById(id);
		if (!writer) {
			return res.status(404).json({
				success: false,
				message: 'Writer not found'
			});
		}

		writer.fullName = fullName;
		writer.email = email;
		writer.skills = skills.map(skill => ({
			skill: skill.skill,
			experience: skill.experience
		}));
		writer.familiarWith = familiarWith.filter(item => item.trim() !== '');
		writer.education = education.map(edu => ({
			qualification: edu.qualification,
			place: edu.place,
			startYear: edu.startYear,
			endYear: edu.endYear,
			grade: edu.grade
		}));
		writer.bio = bio;

		if (req.file) {
			try {
				writer.profilePic = await uploadToCloudinary(req.file, 'easyPro/images');
			} catch (uploadError) {
				return res.status(500).json({
					success: false,
					message: 'Failed to upload profile picture'
				});
			}
		}

		await writer.save();
		
		res.status(200).json({
			success: true,
			message: 'Writer updated successfully',
			data: writer
		});
		
	} catch (error) {
		console.error('Error updating writer:', error);
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