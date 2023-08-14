const express = require("express");
const path = require("path");
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const colors = require("colors");
const errorHandler = require("./middleware/error");

const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

require("dotenv").config({ path: path.resolve(__dirname, "./config/config.env")});

// Route files
const products = require("./routes/products");
const categories = require("./routes/categories");
const auth = require("./routes/auth");
const users = require("./routes/users");
const reviews = require("./routes/reviews");
const favorites = require("./routes/favorites");
const orders = require("./routes/orders");
const webhooks = require("./routes/webhooks");


// Middleware
const morgan = require("morgan");

connectDB(process.env.MONGO_URI);

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

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent cross-site scripting
app.use(xss());

// Rate limit
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 200,
});

app.use(limiter);

// Prevent HTTP param pollution
app.use(hpp());

// TODO: fix cors
// Enable CORS
app.use(cors());
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Mount routes
app.use("/api/v1/products", products);
app.use("/api/v1/categories", categories);
app.use("/api/v1/auth", auth);
app.use("/api/v1/users", users);
app.use("/api/v1/reviews", reviews);
app.use("/api/v1/favorites", favorites);
app.use("/api/v1/orders", orders);
app.use("/api/v1/webhooks/payment", webhooks);

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

module.exports = server;