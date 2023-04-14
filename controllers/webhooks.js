const Order = require("../models/Order");
require("dotenv").config();

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const { getDiscountedPrice } = require("../utils/productHelpers");

const Stripe = require("stripe");

/**
 * @desc    Get all orders
 * @route   GET api/v1/orders
 * @access  Private
 */
exports.handlePaymentIntentResponse = asyncHandler(async (req, res, next) => {
    const event = req.body;
    const stripe = Stripe(process.env.STRIPE_SECRET);

    // get type of event
    const obj = event.data.object;
    const type = obj.object;

    // TODO: remove this?
    if (type === "payment_intent") {
        let status = "waitingForPayment";
        switch (event.type) {
            case "payment_intent.created":
                status = "waitingForPayment";
                break;
            case "payment_intent.succeeded":
                status = "paymentCompleted";
                break;
            default:
                status = "paymentRejected";
                break;
        }
        console.log(status);
        if (status === "waitingForPayment") {
            return res.json({});
        }
        const order = await Order.findOne({ stripe_id: obj.id });
        // console.log(order);
    }

    if (type === "checkout.session") {
        const sessionId = obj.id;
        const order = await Order.findOne({ stripe_id: sessionId });
        if (order) {
            order.payment_intent = obj.payment_intent;
            let status = "waitingForPayment";
            switch (event.type) {
                case "checkout.session.created":
                    status = "waitingForPayment";
                    break;
                case "checkout.session.completed":
                case "checkout.session.async_payment_succeeded":
                    status = "paymentCompleted";
                    break;
                default:
                    status = "paymentRejected";
                    break;
            }
            order.status = status;
            await order.save();
        }
    }
    if (type === "charge") {
        const sessionId = obj.id;
        // const order = await Order.findOne({ stripe_id: sessionId });
        // order.payment_intent =
    }
    return res.json({res: res.body});
});