const express = require('express');

const cors = require('cors');
const connectDB = require('./config/db');
const userRouter = require('./routes/userRoutes.js');
const writerRouter = require('./routes/writerRoutes.js');
const orderRouter = require('./routes/orderRoutes.js');
const reviewRouter = require('./routes/reviewRoutes.js');
const resourceRouter = require('./routes/resourceRoutes.js');
const createAdminIfNotExists = require('./scripts/adminSeed.js');

require('dotenv').config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base route
app.get('/', (req, res) => res.send('API is running...'));

// End points
app.use("/easyPro/user", userRouter);
app.use("/easyPro/writer", writerRouter);
app.use("/easyPro/order", orderRouter);
app.use("/easyPro/review", reviewRouter);
app.use("/easyPro/resource", resourceRouter);

const PORT = process.env.PORT || 5555;

app.listen(PORT, async () => {
	console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
	await connectDB();
	await createAdminIfNotExists();
});