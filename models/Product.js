const mongoose = require("mongoose");
const slugify = require("slugify");
const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    unique: true,
    trim: true,
    maxLength: [100, "Name cannot be more than 100 characters"],
  },
  slug: String,
  category: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    required: true,
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    maxLength: [5000, "Name cannot be more than 5000 characters"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
  discount: {
    type: Number,
    default: 0,
  },
  date_added: {
    type: Date,
    default: Date.now(),
  },
  needs_upload: {
    type: Boolean,
    default: false,
  },
  specifications: {
    type: Object,
    default: null,
  },
  averageRating: {
    type: Number,
    min: [1, "Rating must be at least 1"],
    max: [5, "Rating cannot be more than 5"],
  },
  images: [
    {
      type: String,
      default: ["no-photo.jpeg"],
    },
  ],
});

// Create Product slug from the name
ProductSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Update Product slug when name is updated
ProductSchema.pre("findOneAndUpdate", function (next) {
  if (this._update.name)
    this._update.slug = slugify(this._update.name, { lower: true });
  next();
});

ProductSchema.index({ description: "text", name: "text" });

module.exports = mongoose.model("Product", ProductSchema);
