const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let memoryServer;

async function connectDatabase() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hospital";

  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected to ${uri.replace(/\/\/.*@/, "//***@")}`);
    return;
  } catch (error) {
    const shouldFallback =
      error &&
      (error.code === "ENOTFOUND" ||
        error.name === "MongoNetworkError" ||
        /ENOTFOUND|ECONNREFUSED/i.test(error.message));

    if (!shouldFallback) throw error;

    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
    console.log("MongoDB connected using in-memory fallback");
  }
}

module.exports = { connectDatabase };
