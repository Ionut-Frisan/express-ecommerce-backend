const Favorite = require("../models/Favorite");
const Product = require("../models/Product");
const Order = require("../models/Order");
require("dotenv").config();

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const { getDiscountedPrice } = require("../utils/productHelpers");
const { getUserFromResponse } = require("../utils/user");

const Stripe = require("stripe");

/**
 * @desc    Get all orders
 * @route   GET api/v1/orders
 * @access  Private
 */
exports.getOrders = asyncHandler(async (req, res, next) => {
    const orders = await Order.find().populate({path: 'products'});
    res.status(200).json({success: true, data: orders});
});

/**
 * @desc    Get all orders for logged-in user
 * @route   GET api/v1/orders/me
 * @access  Private
 */
exports.getMyOrders = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const orders = await Order.find({ user: user._id }).populate('products');
    res.status(200).json({success: true, data: orders});
});

/**
 * @desc    Get order by id
 * @route   GET api/v1/orders/:id
 * @access  public
 */
exports.getOrderById = asyncHandler(async (req, res, next) => {
    const id = req.params.id;
    const order = await Order.findById(id).populate('products');
    res.status(200).json({success: true, data: order});
});

/**
 * @desc    Add new order with stripe payment
 * @route   Post api/v1/orders
 * @access  Private
 */
exports.createOrder = asyncHandler(async (req, res, next) => {
    const user = await getUserFromResponse(req);

    const { products, details } = req.body;

    if (!Array.isArray(products) || !products.length) {
        return next(new ErrorResponse('Cannot complete payment without any products.', 400));
    }

    const stripe = Stripe(process.env.STRIPE_SECRET);

    // TODO: Add delivery fee when applicable
    const lineItems = products.map((prod) => {
        const unit_amount = parseInt(getDiscountedPrice(prod.product, true));
        return {
            price_data: {
                currency: 'gbp',
                unit_amount,
                product_data: {
                    name: prod.product.name,
                },
            },
            quantity: prod.quantity,
        }
    });
    const stripeParams = {
        payment_method_types: ["card"],
        mode: "payment",
        success_url: "http://localhost:5173/success",
        cancel_url: "http://localhost:3000/cancel",
        line_items: lineItems,
    };

    const session = await stripe.checkout.sessions.create(stripeParams);

    const productIds = products.map((prod) => prod.product._id);
    const quantities = products.map((prod) => ({[prod.product._id]: prod.quantity}));
    const orderDetails = {
        ...details,
        products: productIds,
        originalProducts: products,
        firstName: details.firstName || user?.firstName,
        lastName: details.lastName || user?.lastName,
        email: details.email || user?.email,
        payment_intent: session.payment_intent,
        stripe_id: session.id,
        quantities,
        total: session.amount_total,
        user,
    }

    const order = await Order.create(orderDetails);

    res.status(201).json({success: true, data: { order, sessionId: session.id, url: session.url }});
})

/**
 * @desc    Add product to favorites
 * @route   Delete api/v1/favorites/:productId
 * @access  Private
 */
exports.deleteFavorite = asyncHandler(async (req, res, next) => {
    const user = req.user;

    const product = await Product.findById(req.params.productId)
    if (!product) {
        return next(new ErrorResponse('Something went wrong. Try again.'), 404);
    }
    await Favorite.findOneAndDelete({user, product})
    // console.log(err, doc);
    // if(err)
    //     return res.status(404).json({success: false, data: "Something went wrong"})
    // else{
    //     user.favorites = user.favorites.filter((favorite) => favorite.toString() !== doc._id.toString())
    //     await user.save()
    // }
    // });

    res.status(201).json({success: true, data: 'Product was removed from favorites'});
})