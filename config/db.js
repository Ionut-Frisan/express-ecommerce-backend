const mongoose = require("mongoose");

const connectDB = async (uri) => {
  const conn = await mongoose.connect(uri, {
    useNewUrlParser: true,
  })
      .then((res) => console.log(`Mongo connected`))
      .catch((err) => {
        console.error(err);
        process.exit(1)
      })
  ;
};

module.exports = connectDB;
