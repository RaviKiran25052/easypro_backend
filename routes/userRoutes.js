const express = require('express');
const userController = require('../controllers/userControllers');
const multer = require('multer');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadProfileImage = upload.single('profilePic');

router.post('/login', userController.login);
router.post('/register', uploadProfileImage, userController.register);

module.exports = router;