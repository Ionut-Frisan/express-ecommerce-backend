const express = require("express");
const connectDB = require("./config/db");
const colors = require("colors");
const errorHandler = require("./middleware/error");
// Route files
const products = require("./routes/products");
const categories = require("./routes/categories");

require("dotenv").config({ path: "./config/config.env" });

connectDB(process.env.MONGO_URI);
// Middleware
const morgan = require("morgan");

// Load env files
const PORT = process.env.PORT || 5000;

const app = express();

// Body parser
app.use(express.json());

// Dev logging middleware
if (process.env.NODE_ENV == "development") {
  app.use(morgan("dev"));
}

// Mount routes
app.use("/api/v1/products", products);
app.use("/api/v1/categories", categories);

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
