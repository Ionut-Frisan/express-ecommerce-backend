const express = require("express");

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categories");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// Re-route into other resource routers
const productRouter = require("./products");
router.use("/:categoryId/products", productRouter);

router
  .route("/")
  .get(getCategories)
  .post(protect, authorize("admin"), createCategory);
router
  .route("/:id")
  .get(protect, authorize("admin"), getCategory)
  .put(protect, authorize("admin"), updateCategory)
  .delete(protect, authorize("admin"), deleteCategory);

module.exports = router;
