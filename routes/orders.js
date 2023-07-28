const express = require("express");

const {
    createOrder,
    getOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
} = require("../controllers/orders");

const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router
    .route("/")
    .get(protect, authorize("admin"), getOrders)
    .post(createOrder);

router
    .route("/me")
    .get(protect, getMyOrders);

router
    .route("/:id")
    .get(getOrderById)


router
    .route("/:id/status")
    .patch(updateOrderStatus)


module.exports = router;
