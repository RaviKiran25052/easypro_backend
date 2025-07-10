const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { URL } = require('url');

const router = express.Router();

const API_URL = process.env.GOWINSTON_API_URL
const API_TOKEN = process.env.GOWINSTON_API_TOKEN

const plagiarismLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: {
		success: false,
		error: 'Too many plagiarism checks',
		message: 'Please wait before making another request'
	}
});

const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000;

const getCacheKey = (input, type) => {
	const crypto = require('crypto');
	return `${type}:${crypto.createHash('md5').update(input).digest('hex')}`;
};

const getFromCache = (key) => {
	const cached = cache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
		return cached.data;
	}
	cache.delete(key);
	return null;
};

const setCache = (key, data) => {
	cache.set(key, {
		data,
		timestamp: Date.now()
	});
};

const isValidUrl = (string) => {
	try {
		new URL(string);
		return true;
	} catch {
		return false;
	}
};

const validateInput = (req, res, next) => {
	const { input } = req.body;

	if (!input || typeof input !== 'string') {
		return res.status(400).json({
			success: false,
			error: 'Invalid input',
			message: 'Input must be a non-empty string'
		});
	}

	if (input.length > 50000) {
		return res.status(400).json({
			success: false,
			error: 'Input too large',
			message: 'Input must be less than 50,000 characters'
		});
	}

	req.body.input = input.trim();
	next();
};

const handleGoWinstonError = (error) => {
	if (error.response) {
		const status = error.response.status;
		const data = error.response.data;

		switch (status) {
			case 401:
				return 'Authentication failed. Please check API credentials.';
			case 403:
				return 'Access forbidden. Please check your API permissions.';
			case 429:
				return 'Rate limit exceeded. Please try again later.';
			case 500:
				return 'GoWinston API is temporarily unavailable.';
			default:
				return `GoWinston API Error: ${status} - ${data?.message || 'Unknown error'}`;
		}
	} else if (error.request) {
		return 'Failed to connect to GoWinston API. Please check your internet connection.';
	} else {
		return `Request setup error: ${error.message}`;
	}
};

const processUrl = async (url) => {
	const payload = {
		language: "en",
		country: "us",
		file: url
	};

	const headers = {
		"Authorization": `Bearer ${API_TOKEN}`,
		"Content-Type": "application/json"
	};

	const response = await axios.post(API_URL, payload, {
		headers,
		timeout: 60000
	});

	return {
		plagiarismResult: response.data,
		inputUrl: url,
		domain: new URL(url).hostname,
		processedAt: new Date().toISOString()
	};
};

const processText = async (text) => {
	const payload = {
		language: "en",
		country: "us",
		text: text
	};

	const headers = {
		"Authorization": `Bearer ${API_TOKEN}`,
		"Content-Type": "application/json"
	};

	const response = await axios.post(API_URL, payload, {
		headers,
		timeout: 45000
	});

	return {
		plagiarismResult: response.data,
		textStats: {
			length: text.length,
			wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
			lineCount: text.split('\n').length,
			preview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
		},
		processedAt: new Date().toISOString()
	};
};

// @route   POST /easyPro/plagiarism/check
// @desc    Check plagiarism for text or URL
// @access  Public (but rate limited)
router.post('/check', plagiarismLimiter, validateInput, async (req, res) => {
	try {
		const { input, type } = req.body;
		const detectedType = type || (isValidUrl(input) ? 'url' : 'text');

		const cacheKey = getCacheKey(input, detectedType);
		const cached = getFromCache(cacheKey);

		if (cached) {
			return res.json({
				...cached,
				cached: true,
				message: cached.message + ' (cached result)'
			});
		}

		let processedData;
		let message;

		if (detectedType === 'url') {
			if (!isValidUrl(input)) {
				return res.status(400).json({
					success: false,
					error: 'Invalid URL',
					message: 'The provided input is not a valid URL'
				});
			}

			processedData = await processUrl(input);
			message = `Successfully processed URL for plagiarism check: ${new URL(input).hostname}`;
		} else {
			processedData = await processText(input);
			message = `Successfully processed text for plagiarism check (${processedData.textStats?.length || 0} characters)`;
		}

		const response = {
			success: true,
			type: detectedType,
			message,
			timestamp: new Date().toISOString(),
			input: input.substring(0, 200) + (input.length > 200 ? '...' : ''),
			data: processedData,
			cached: false
		};

		setCache(cacheKey, response);

		res.json(response);

	} catch (error) {
		console.error('Plagiarism check error:', error);

		const errorMessage = handleGoWinstonError(error);

		res.status(error.response?.status || 500).json({
			success: false,
			error: 'Processing failed',
			message: errorMessage,
			timestamp: new Date().toISOString()
		});
	}
});

// @route   GET /easyPro/plagiarism/health
// @desc    Health check for plagiarism service
// @access  Public
router.get('/health', (req, res) => {
	res.json({
		success: true,
		status: 'healthy',
		service: 'plagiarism-detection',
		timestamp: new Date().toISOString(),
		cache_size: cache.size,
		api_configured: !!API_TOKEN
	});
});

// @route   GET /easyPro/plagiarism/stats
// @desc    Get cache statistics
// @access  Public
router.get('/stats', (req, res) => {
	res.json({
		success: true,
		cache_size: cache.size,
		cache_duration_minutes: CACHE_DURATION / 60000,
		rate_limit: '20 requests per 15 minutes',
		timestamp: new Date().toISOString()
	});
});

// Clean up cache periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of cache.entries()) {
		if (now - value.timestamp > CACHE_DURATION) {
			cache.delete(key);
		}
	}
}, 2 * 60 * 1000);

module.exports = router;