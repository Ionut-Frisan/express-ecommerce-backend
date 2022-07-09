const mongoose = require("mongoose");

const connectDB = async (uri) => {
  const conn = await mongoose.connect(uri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });
  console.log(`Mongo connected: ${conn.connection.host}`.cyan.underline.bold);
};

module.exports = connectDB;
