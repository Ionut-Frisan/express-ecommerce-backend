const mongoose = require("mongoose");
const {uuid} = require('uuidv4');

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
    },
    originalProducts: [{
        type: Object,
        required: true,
    }],
    products: [{
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Product',
    }],
    quantities: [Object],
    uuid: {
        type: String,
        default: uuid(),
    },
    firstName: String,
    lastName: String,
    county: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    zip: {
        type: String,
    },
    phone_number: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
        ],
    },
    payment_type: {
        type: String,
        enum: ["card", "cash"],
        default: "card",
    },
    vouchers: [String],
    stripe_id: String,
    payment_intent: {
        type: String,
    },
    status: {
        type: String,
        enum: [
            "waitingForPayment",
            "paymentCompleted",
            "orderAccepted",
            "inProgress",
            "delivering",
            "completed",
            "cancelled",
            "paymentRejected",
        ],
        default: "waitingForPayment",
    },
    total: Number,
    created_at: {
        type: Date,
        default: new Date(),
    }
})

module.exports = mongoose.model("Order", OrderSchema);