const mongoose = require("mongoose");

const connectDB = async (uri) => {
  const conn = await mongoose.connect(uri, {
    useNewUrlParser: true,
  });
};

module.exports = connectDB;
