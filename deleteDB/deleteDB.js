const mongoose = require("mongoose");

require("dotenv").config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  await mongoose.connection.dropDatabase();
  console.log("✅ Database dropped successfully");
  process.exit();
});