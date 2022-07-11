const express = require("express");

// Import Middleware
const advancedResults = require("../middleware/advancedResults");

// Import Model
const Product = require("../models/Product");

const { protect, authorize } = require("../middleware/auth");

const {
  getProduct,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  productUploadPhoto,
} = require("../controllers/products");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(/*advancedResults(Product, "category"),*/ getProducts)
  .post(protect, authorize("admin"), createProduct);
router
  .route("/:id")
  .get(getProduct)
  .put(protect, authorize("admin"), updateProduct)
  .delete(protect, authorize("admin"), deleteProduct);
router.route("/:id/photo").put(protect, authorize("admin"), productUploadPhoto);

module.exports = router;
