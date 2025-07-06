const Review = require('../models/Review');
const Writer = require('../models/Writer');

exports.test = async (req, res) => {
	res.send("done")
}

exports.createReview = async (req, res) => {
	try {
		const {
			followingInstructions,
			grammar,
			responseSpeed,
			formatting,
			other,
			description,
			writer,
			order
		} = req.body;

		// Validate required fields
		if (!followingInstructions || !grammar || !responseSpeed || !formatting) {
			return res.status(400).json({
				success: false,
				message: 'All rating fields (followingInstructions, grammar, responseSpeed, formatting) are required'
			});
		}

		if (!writer || !order) {
			return res.status(400).json({
				success: false,
				message: 'Writer ID and Order ID are required'
			});
		}

		// Validate rating ranges (1-5)
		const ratings = [followingInstructions, grammar, responseSpeed, formatting];
		for (let rating of ratings) {
			if (rating < 1 || rating > 5) {
				return res.status(400).json({
					success: false,
					message: 'All ratings must be between 1 and 5'
				});
			}
		}

		// Validate other ratings if provided
		if (other && Array.isArray(other)) {
			for (let item of other) {
				if (item.rating && (item.rating < 1 || item.rating > 5)) {
					return res.status(400).json({
						success: false,
						message: 'All other ratings must be between 1 and 5'
					});
				}
			}
		}

		// Create the review
		const newReview = new Review({
			followingInstructions,
			grammar,
			responseSpeed,
			formatting,
			other: other || [],
			description: description || '',
			writer: writer,
			user: req.user._id, // From authenticated user
			order: order
		});

		const savedReview = await newReview.save();

		// Calculate new review's average
		let totalSum = followingInstructions + grammar + responseSpeed + formatting;
		let count = 4;

		if (Array.isArray(other)) {
			other.forEach(item => {
				if (item.rating) {
					totalSum += item.rating;
					count += 1;
				}
			});
		}

		const newReviewAvg = totalSum / count;

		// Update writer's avg rating and count
		const writerDoc = await Writer.findById(writer);
		if (!writerDoc) {
			return res.status(404).json({
				success: false,
				message: 'Writer not found'
			});
		}

		const oldAvg = writerDoc.rating.avgRating;
		const oldCount = writerDoc.rating.count;

		const updatedAvg = ((oldAvg * oldCount) + newReviewAvg) / (oldCount + 1);

		writerDoc.rating.avgRating = parseFloat(updatedAvg.toFixed(2));
		writerDoc.rating.count = oldCount + 1;

		await writerDoc.save();

		res.status(201).json({
			success: true,
			message: 'Review created successfully',
			data: savedReview
		});

	} catch (error) {
		console.error('Error creating review:', error);

		// Handle validation errors
		if (error.name === 'ValidationError') {
			const errors = Object.values(error.errors).map(err => err.message);
			return res.status(400).json({
				success: false,
				message: 'Validation error',
				errors: errors
			});
		}

		// Handle duplicate key errors or other mongoose errors
		if (error.code === 11000) {
			return res.status(400).json({
				success: false,
				message: 'Duplicate review detected'
			});
		}

		res.status(500).json({
			success: false,
			message: 'Internal server error'
		});
	}
};