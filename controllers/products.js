const Product = require("../models/Product");
const Category = require("../models/Category");
const Favorite = require("../models/Favorite");
const {getUserFromResponse} = require("../utils/user");

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

const path = require("path");
const fs = require("fs");

/**
 * @desc    Get all products
 * @route   GET api/v1/products
 * @route   GET api/v1/categories/:categoryId/products
 * @access  Public
 */
exports.getProducts = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Product.countDocuments();

  const getQuery = () => {
    let query;

    const reqQuery = { ...req.query };

    // Fields to exlude
    const removeFields = ["select", "sort", "page", "limit", "keyword"];

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

    if (req.params.categoryId) {
      query = Product.find({
        ...JSON.parse(queryStr),
        category: req.params.categoryId,
      });
    } else {
      query = Product.find(JSON.parse(queryStr)).populate("category"); // .populate({ path: 'category', select: 'name slug'});
    }

    // Search
    if (req.query.keyword) {
      query = query.find({ $text: { $search: new RegExp(req.query.keyword) } });
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
    // TODO: Look into this
    // query.populate('Category');

    return query;

    // return query.skip(startIndex).limit(limit);
  };

  let query = getQuery();
  query = query.skip(startIndex).limit(limit);
  let products = await query;
  products = await mapFavorites(req, products);
  //


  const queryCopy = getQuery();
  const totalCount = await queryCopy.count();

  // Pagination Result
  const pagination = { count: totalCount };
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
 * @route   GET api/v1/products/:slug
 * @access  Public
 */
exports.getProduct = asyncHandler(async (req, res, next) => {
  // const product = await Product.findById(req.params.id);
  let product = await Product.find({ slug: req.params.id });
  if (!product) {
    return next(
      new ErrorResponse(`Product not found with id of ${req.params.id}`, 404)
    );
  }

  product = await mapFavorites(req, product);

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

  if(req.body.specifications)
    try {
      req.body.specifications = JSON.parse(req.body.specifications) || null;
    } catch (e) {
      req.body.specifications = null;
    }
  const product = await Product.create(req.body);

  const saveFile = (file) => {
    const generateFilename = (file) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
      let name = "";
      for(let i=0;i <20; i++){
        name += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return `photo_${product.id}_${name}${path.parse(file.name).ext}`
    }
    if (
      file.mimetype.startsWith("image") &&
      file.size <= process.env.MAX_FILE_UPLOAD
    ) {
      file.name = generateFilename(file);
      console.log(`filename: ${file.name}`);
      file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
        console.log(`file.mv`);
        if (err) {
          console.log(`error for file: ${file.name}`);
          return next(
            new ErrorResponse("Something went wrong when saving a file", 500)
          );
        }
      });
      namesArr.push(file.name);
    }
  };

  let namesArr = [];
  console.log(req.files);
  console.log(req.images);
  if (req.files?.images) {
    let files = req.files.images;
    if (Array.isArray(files)) for (const file of files) saveFile(file);
    else saveFile(files);
  }
  console.log({namesArr});
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

  // remove all images linked to this product
  for (const image of product.images){
      fs.unlink(`${process.env.FILE_UPLOAD_PATH}/${image}`, (err) => {
        if(err){
          console.log(`${image} could not be removed`);
        }
        else {
          console.log(`${image} was removed`);
        }
      })
  }
  // remove favorites for this product
  await Favorite.deleteMany({product: req.params.id});


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
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    await Product.findByIdAndUpdate(req.params.id, { images: [file.name] });
    res.status(200).json({ success: true, data: file.name });
  });
});

exports.getCartPrice = asyncHandler(async (req, res, next) => {
  const { products } = req.body;
  if(!products) return res.json({success: false, data: 'No products.'}).status(404);

  const ids = products.map((product) => product.id);
  const dbProducts = await Product.find({_id: {$in: ids}}).select('price discount');

  const price = dbProducts.reduce((sum, curr) => {
    const product = products.find((prod) => prod.id === curr.id);
    return sum + (product.quantity * curr.price * (100 - curr.discount) / 100);
  }, 0)

  res.json({success: true, data: {price, dbProducts}});
});

const mapFavorites = async (req, products) => {
  const user = await getUserFromResponse(req);
  if(!user) return products;

  let favorites = await Favorite.find({user});
  if(!favorites) return products;

  favorites = favorites.map((favorite) => favorite.product.toString())

  if(Array.isArray(products)){
    return products.map((product) => {
      return favorites.some((favoriteId) => favoriteId === product.id)
        ? { ... product._doc, favorite: true}
        : { ...product._doc, favorite: false}
    })
  }
  else if(typeof products === 'object'){
    return favorites.some((favoriteId) => favoriteId === products.id)
        ? { ... products._doc, favorite: true}
        : { ...products._doc, favorite: false}
  }
  return products;
}
