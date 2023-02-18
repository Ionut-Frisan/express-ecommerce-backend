const Favorite = require("../models/Favorite");
const Product = require("../models/Product");

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

/**
 * @desc    Get logged in user's favorites
 * @route   GET api/v1/favorites
 * @access  Private
 */
exports.getMyFavorites = asyncHandler(async (req, res, next) => {
    const user = req.user;

    const favorites = await Favorite.find({user}).populate({path: 'product'});
    console.log(favorites);
    res.status(200).json({success: true, data: favorites});
});

/**
 * @desc    Add product to favorites
 * @route   Post api/v1/favorites/:productId
 * @access  Private
 */
exports.createFavorite = asyncHandler(async (req, res, next) => {
    const user = req.user;

    const product = await Product.findById(req.params.productId)
    if (!product) {
        return next(new ErrorResponse('Something went wrong. Try again.'), 404);
    }
    const favorite = await Favorite.create({user, product});
    res.status(201).json({success: true, data: favorite});
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