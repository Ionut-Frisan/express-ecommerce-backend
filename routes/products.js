const express = require("express");

// Import Middleware
const advancedResults = require("../middleware/advancedResults");

// Import Model
const Product = require("../models/Product");

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
  .post(createProduct);
router.route("/:id").get(getProduct).put(updateProduct).delete(deleteProduct);
router.route("/:id/photo").put(productUploadPhoto);

module.exports = router;
