const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const colors = require("colors");
const errorHandler = require("./middleware/error");

// Route files
const products = require("./routes/products");
const categories = require("./routes/categories");
const auth = require("./routes/auth");

require("dotenv").config({ path: "./config/config.env" });

connectDB(process.env.MONGO_URI);
// Middleware
const morgan = require("morgan");

// Load env files
const PORT = process.env.PORT || 5000;

const app = express();

// Body parser
app.use(express.json());

app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV == "development") {
  app.use(morgan("dev"));
}

// File uploading
app.use(fileUpload());

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Mount routes
app.use("/api/v1/products", products);
app.use("/api/v1/categories", categories);
app.use("/api/v1/auth", auth);

app.use(errorHandler);
const server = app.listen(PORT, () =>
  console.log(
    `Server running in ${process.env.NODE_ENV} port: ${PORT}`.yellow.bold
  )
);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log(`Error:  ${err.message}`.red);
  // Close server and exit process with failure
  server.close(() => process.exit(1));
});
