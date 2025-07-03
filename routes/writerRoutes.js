const express = require('express');
const writerController = require('../controllers/writerControllers');
const { protectAdmin, protectBoth } = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadProfileImage = upload.single('profilePic');

router.route('/')
	.get(protectBoth, writerController.getAllWriters)
	.post([protectAdmin, uploadProfileImage], writerController.createWriter);

router.route('/:id')
	.get(protectBoth, writerController.getWriterById)
	.patch([protectAdmin, uploadProfileImage], writerController.updateWriter)
	.delete(protectAdmin, writerController.deleteWriter);
	
module.exports = router;