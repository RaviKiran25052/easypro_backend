const express = require('express');
const multer = require('multer');
const resourceController = require('../controllers/resourceControllers');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadResource = upload.single('file');

router.route('/')
	.get(resourceController.getResources)
	.post([protectAdmin, uploadResource], resourceController.createResource);

router.route('/:id')
	.get(resourceController.getResourceById)
	.patch([protectAdmin, uploadResource], resourceController.updateResourceById)
	.delete([protectAdmin, uploadResource], resourceController.deleteResourceById)

module.exports = router;