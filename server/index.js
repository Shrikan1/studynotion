// Importing necessary modules and packages
const express = require("express");
const app = express();
const userRoutes = require("./routes/user");
const profileRoutes = require("./routes/profile");
const courseRoutes = require("./routes/Course");
const paymentRoutes = require("./routes/Payments");
const contactUsRoute = require("./routes/Contact");
const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");

const path = require("path");
const os = require("os");

// Loading environment variables from .env file
dotenv.config();

// Setting up port number
const PORT = process.env.PORT || 4000;

// Connecting to database
database.connect();
 
// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
	cors({
		origin: "*",
		credentials: true,
	})
);
app.use(
	fileUpload({
		useTempFiles: true,
		tempFileDir: path.join(os.tmpdir(), "studynotion-temp"),
		createParentPath: true,
	})
);

// Connecting to cloudinary
cloudinaryConnect();

// Setting up routes
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/reach", contactUsRoute);

// Testing the server
app.get("/", (req, res) => {
	return res.json({
		success: true,
		message: "Your server is up and running ...",
	});
});

// Handle 404 routes
app.use((req, res) => {
	return res.status(404).json({
		success: false,
		message: `Route not found: ${req.originalUrl}`,
	});
});

// Global error handling middleware
app.use((err, req, res, next) => {
	console.error("Unhandled server error:", err);
	return res.status(err.status || 500).json({
		success: false,
		message: err.message || "Internal server error",
	});
});

// Listening to the server
app.listen(PORT, () => {
	console.log(`App is listening at ${PORT}`);
});

// End of code.
