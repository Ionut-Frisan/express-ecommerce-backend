const Product = require("../models/Product");
const Category = require("../models/Category");

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

const path = require("path");

/**
 * @desc    Get all products
 * @route   GET api/v1/products
 * @route   GET api/v1/categories/:categoryId/products
 * @access  Public
 */
exports.getProducts = asyncHandler(async (req, res, next) => {
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

  if (req.params.categoryId) {
    query = Product.find({
      ...JSON.parse(queryStr),
      category: req.params.categoryId,
    });
  } else {
    query = Product.find(JSON.parse(queryStr)).populate("category"); // .populate({ path: 'category', select: 'name slug'});
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
  const total = await Product.countDocuments();

  query = query.skip(startIndex).limit(limit);

  const products = await query;

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
    count: products.length,
    pagination,
    data: products,
  });
});

/**
 * @desc    Get single product
 * @route   GET api/v1/products/:id
 * @access  Public
 */
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }
  res.status(200).json({ success: true, data: product });
});

/**
 * @desc    Create new product
 * @route   POST api/v1/products/
 * @access  Private
 */
exports.createProduct = asyncHandler(async (req, res, next) => {
  const category = Category.findById(req.body.category);
  if (!category) {
    return next(
      new ErrorResponse(
        `Category not found with id of ${req.body.category}`,
        404
      )
    );
  }
  const product = await Product.create(req.body);

  const saveFile = (file) => {
    if (
      file.mimetype.startsWith("image") &&
      file.size <= process.env.MAX_FILE_UPLOAD
    ) {
      file.name = `photo_${product.id}${path.parse(file.name).ext}`;
      file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
        if (err) {
          return next(
            new ErrorResponse("Something went wrong when saving a file", 500)
          );
        }
      });
      namesArr.push(file.name);
    }
  };

  let namesArr = [];
  if (req.files?.images) {
    let files = req.files.images;
    console.log(typeof files);
    if (Array.isArray(files)) for (const file of files) saveFile(file);
    else saveFile(files);
  }
  console.log(namesArr);
  if (namesArr && product) {
    product.images = namesArr;
    await product.save();
  }
  res.status(201).json({ success: true, data: product });
});

/**
 * @desc    Update product
 * @route   PUT api/v1/products/:id
 * @access  Private
 */
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: product });
});

/**
 * @desc    Delete product
 * @route   Delete api/v1/products/:id
 * @access  Private
 */
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: {} });
});

/**
 * @desc    Upload photo for product
 * @route   Put api/v1/products/:id/photo
 * @access  Private
 */
exports.productUploadPhoto = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  // Make sure the file is an image
  const file = req.files.image;
  if (!file.mimetype.startsWith("image")) {
    return next(new ErrorResponse("Please upload an image file", 400));
  }

  // Check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }

  // Create custom file name
  file.name = `photo_${product._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Product.findByIdAndUpdate(req.params.id, { images: [file.name] });
    res.status(200).json({ success: true, data: file.name });
  });
});
