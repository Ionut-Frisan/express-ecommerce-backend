const mongoose = require("mongoose");
const CategorySchema = new mongoose.Schema({});

// Create Product slug from the name
// ProductSchema.pre("save", function (next) {
//   this.slug = slugify(this.name, { lower: true });
//   next();
// });

module.exports = mongoose.model("Category", CategorySchema);
