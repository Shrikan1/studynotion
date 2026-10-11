const mongoose = require("mongoose");
require("dotenv").config();

exports.connect = () => {
	const mongoUrl =
		process.env.MONGODB_URL ||
		process.env.DB_URL ||
		"mongodb://127.0.0.1:27017/studynotion";

	if (!process.env.MONGODB_URL && !process.env.DB_URL) {
		console.warn(
			"Warning: MONGODB_URL is not set in environment variables. Falling back to local MongoDB: mongodb://127.0.0.1:27017/studynotion"
		);
	}

	mongoose
		.connect(mongoUrl)
		.then(() => console.log("DB Connection Success"))
		.catch((err) => {
			console.error("DB Connection Failed");
			console.error(err);
		});

	mongoose.connection.on("error", (err) => {
		console.error("MongoDB runtime connection error:", err);
	});

	mongoose.connection.on("disconnected", () => {
		console.warn("MongoDB connection disconnected");
	});
};
