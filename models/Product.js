const mongoose = require("mongoose");
const slugify = require("slugify");
const ProductSchema = new mongoose.Schema({
  // uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
  // category = models.ForeignKey(
  //     Category, related_name='products', on_delete=models.CASCADE, null=False)
  // name = models.CharField(max_length=255, null=False)
  // slug = models.SlugField(null=False, unique=True)
  // description = models.TextField(blank=True, null=True)
  // price = models.DecimalField(max_digits=10, decimal_places=2, null=False)
  // discount = models.DecimalField(max_digits=5, decimal_places=2, default=0)
  // image = models.ImageField(upload_to="uploads/", blank=True, null=True)
  // thumbnail = models.ImageField(upload_to="uploads/", blank=True, null=True)
  // specifications = models.JSONField(default=dict, null=True, blank=True)
  // needs_upload = models.BooleanField(default=False)
  // date_added = models.DateTimeField(auto_now_add=True)
  name: {
    type: String,
    required: [true, "Name is required"],
    unique: true,
    trim: true,
    maxLength: [50, "Name cannot be more than 50 characters"],
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
    maxLength: [2000, "Name cannot be more than 2000 characters"],
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
  image: {
    type: String,
    default: "no-photo.jpeg",
  },
});

// Create Product slug from the name
ProductSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Update Product slug when name is updated
ProductSchema.pre("findOneAndUpdate", function (next) {
  if (this._update.name);
  this._update.slug = slugify(this._update.name, { lower: true });
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
