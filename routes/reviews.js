const express = require("express");

// Import Middleware
const advancedResults = require("../middleware/advancedResults");

// Import Model
const Review = require("../models/Review");

const { protect, authorize } = require("../middleware/auth");

const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviews");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(/*advancedResults(Product, "category"),*/ getReviews)
  .post(protect, authorize("user", "admin"), addReview);

router
  .route("/:id")
  .get(getReview)
  .put(protect, authorize("user", "admin"), updateReview)
  .delete(protect, authorize("user", "admin"), deleteReview);

module.exports = router;
