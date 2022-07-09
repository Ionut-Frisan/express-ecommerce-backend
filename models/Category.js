const mongoose = require("mongoose");
const slugify = require("slugify");
const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      maxLength: [255, "Name cannot be more than 255 characters"],
      required: [true, "Please add a name"],
      trim: true,
      unique: true,
    },
    slug: String,
  },
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Create Category slug from the name
CategorySchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Update Category slug when name is updated
CategorySchema.pre("findOneAndUpdate", function (next) {
  if (this._update.name);
  this._update.slug = slugify(this._update.name, { lower: true });
  next();
});

// Cascade delete products when category is removed
CategorySchema.pre("remove", async function (next) {
  await this.model("Product").deleteMany({ category: this._id });
  next();
});

// Reverse populate with virtuals
CategorySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  justOne: false,
});

module.exports = mongoose.model("Category", CategorySchema);
