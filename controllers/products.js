const Product = require("../models/Product");
const Category = require("../models/Category");
const Favorite = require("../models/Favorite");
const {getUserFromResponse} = require("../utils/user");

const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

const path = require("path");

const {
  uploadImage, deleteImage, getImageUrl, getImageArraySrc,
} = require('../utils/imageManager');

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
      query = Product.find(JSON.parse(queryStr)).populate("category");
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

    return query;
  };

  let query = getQuery();
  query = query.skip(startIndex).limit(limit);
  let products = await query;
  products = await mapFavorites(req, products);

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

  const saveFile = async (file) => {
    const generateFilename = (file) => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
      let name = "";
      for(let i=0;i <20; i++){
        name += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return `product-images/photo_${product.id}_${name}${path.parse(file.name).ext}`
    }
    if (
      file.mimetype.startsWith("image") &&
      file.size <= process.env.MAX_FILE_UPLOAD
    ) {
      file.name = generateFilename(file);

      await uploadImage(file).then((res) => {
        namesArr.push(file.name);
      }).catch((err) => console.error('Could not save a file'))
    } else if (file.size > process.env.MAX_FILE_UPLOAD){
      console.log(`file ${file.name} exceeds maximum filesize`)
    }
  };

  let namesArr = [];
  if (req.files?.images) {
    let files = req.files.images;
    if (Array.isArray(files)) {
      const promises = files.map((file) => saveFile(file));
      await Promise.all(promises);
    }
    else await saveFile(files);
  }
  if (namesArr && product) {
    product.images = namesArr;
    await product.save();
    return res.status(201).json({ success: true, data: product });
  }
  return res.status(400).json({success: false, data: product});
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

  // TODO: Promise.all() ?
  // remove all images linked to this product
  for (const image of product.images){
      await deleteImage(image);
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
  // TODO: update this
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

/**
 * @desc    Get cart price
 * @route   Put api/v1/products/cartPrice
 * @access  Public
 */
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
  if(!user) return products.map((product) => product._doc);

  let favorites = await Favorite.find({user});
  if(!favorites) return products.map((product) => product._doc);

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

// Moved to post find schema hook
const mapImageUrls = async (products) => {
  if (!Array.isArray(products) || !products.length) return [];
  const promises = products.map((product) => getImageArraySrc(product.images));
  const res = await Promise.all(promises);
  return products.map((product, index) => {
    return {
      ...product,
      imageUrls: res[index],
    }
  })
}