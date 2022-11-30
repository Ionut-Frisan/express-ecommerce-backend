const express = require("express");
const { protect, authorize } = require("../middleware/auth");

const {getMyFavorites, createFavorite, deleteFavorite} = require("../controllers/favorites");

const router = express.Router();

router
    .route("/")
    .get(protect, authorize("user", "admin"), getMyFavorites)

router
    .route("/:productId")
    .post(protect, authorize("user", "admin"), createFavorite)
    .delete(protect, authorize("user", "admin"), deleteFavorite)

module.exports = router;