const express = require("express");

const {
  getProduct,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/products");

const router = express.Router({ mergeParams: true });

router.route("/").get(getProducts).post(createProduct);
router.route("/:id").get(getProduct).put(updateProduct).delete(deleteProduct);

module.exports = router;
