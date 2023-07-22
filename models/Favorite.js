const mongoose = require("mongoose");
const User = require("./User");
const Product = require("./Product");

const FavoriteSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'Product',
    },
    user: {
        type: mongoose.Schema.ObjectId,
        required: true
    }
});

FavoriteSchema.post('save', async (doc, next) => {
    const user = await User.findById(doc.user);
    if(user)
        user.favorites = [...user.favorites, doc._id];
        await user.save();
    next();
})

FavoriteSchema.post('findOneAndDelete', async (doc, next) => {
    const user = await User.findById(doc.user);
    if(user)
        user.favorites = user.favorites.filter((favorite) => favorite.toString() !== doc._id.toString())
        await user.save();
    next();
})

module.exports = mongoose.model("Favorite", FavoriteSchema);