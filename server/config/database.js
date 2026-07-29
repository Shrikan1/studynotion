const mongoose = require("mongoose");
require("dotenv").config();

const { MONGODB_URL, DB_URL } = process.env;

exports.connect = () => {
	const mongoUrl = MONGODB_URL || DB_URL;

	mongoose
		.connect(mongoUrl, {
			useNewUrlparser: true,
			useUnifiedTopology: true,
		})
		.then(() => console.log(`DB Connection Success`))
		.catch((err) => {
			console.log(`DB Connection Failed`);
			console.log(err);
			process.exit(1);
		});
};
