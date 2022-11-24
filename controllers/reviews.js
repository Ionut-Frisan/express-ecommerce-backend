const Product = require("../models/Product");
const Review = require("../models/Review");

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
/**
 * @desc    Get Reviews
 * @route   GET api/v1/reviews
 * @route   GET api/v1/products/:productId/reviews
 *
 * @access Public
 */
exports.getReviews = asyncHandler(async (req, res, next) => {
  let query;

  const reqQuery = { ...req.query };

  // Fields to exlude
  const removeFields = ["select", "sort", "page", "limit"];

  // Loop over remove fields and remove them from reqQuery

  removeFields.forEach((param) => {
    delete reqQuery[param];
  });

  let queryStr = JSON.stringify(reqQuery);

  // Create valid operators ($gt, $gte etc) for mongo
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  console.log(`queryStr: ${queryStr}`.green.inverse);

  if (req.params.productId) {
    query = Review.find({
      ...JSON.parse(queryStr),
      product: req.params.productId,
    });
  } else {
    query = Review.find(JSON.parse(queryStr)).populate("product"); // .populate({ path: 'product', select: 'name slug'});
  }

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-date_added");
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 40;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Review.countDocuments();

  query = query.skip(startIndex).limit(limit);

  const reviews = await query;

  // Pagination Result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: reviews.length,
    pagination,
    data: reviews,
  });
});

/**
 * @desc    Get single review
 * @route   GET api/v1/reviews/:id
 * @access  Public
 */
exports.getReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id).populate({
    path: "product",
    select: "name description",
  });

  if (!review) {
    return next(
      new ErrorResponse(`No reviews found with id ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: review,
  });
});

/**
 * @desc    Create review
 * @route   POST api/v1/products/:productId/reviews
 * @access  Private
 */
exports.addReview = asyncHandler(async (req, res, next) => {
  // req.body.product = req.params.productId;
  req.body.user = req.user.id;

  const product = await Product.findById(req.body.product);

  if (!product) {
    return next(
      new ErrorResponse(
        `No product found with the id of ${req.body.product}`,
        404
      )
    );
  }
  console.log(req.body);
  let review = await Review.create(req.body);

  const { firstName, lastName } = req.user;

  review = {
    ...review._doc,
    user: {
      firstName,
      lastName,
    }
  }

  res.status(201).json({
    success: true,
    data: review,
  });
});

/**
 * @desc    Update review
 * @route   PUT api/v1/reviews/:id
 * @access  Private
 */
exports.updateReview = asyncHandler(async (req, res, next) => {
  let review = await Review.findById(req.params.id);

  if (!review) {
    return next(
      new ErrorResponse(`No review found with the id of ${req.params.id}`, 404)
    );
  }

  // Make sure review belongs to user or user is an admin
  if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new ErrorResponse(`Not authorized to update review`, 401));
  }

  review = await Review.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: review,
  });
});

/**
 * @desc    Delete review
 * @route   DELETE api/v1/reviews/:id
 * @access  Private
 */
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(
      new ErrorResponse(`No review found with the id of ${req.params.id}`, 404)
    );
  }

  // Make sure review belongs to user or user is an admin
  if (review.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new ErrorResponse(`Not authorized to remove review`, 401));
  }

  await review.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});
