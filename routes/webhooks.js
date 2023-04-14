const express = require("express");

const {
    handlePaymentIntentResponse,
} = require("../controllers/webhooks");
const {protect, authorize} = require("../middleware/auth");

const router = express.Router();

router
    .route("/")
    .get(handlePaymentIntentResponse)
    .post(handlePaymentIntentResponse);

module.exports = router;