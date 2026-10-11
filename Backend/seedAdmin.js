require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const { connectDatabase } = require("./db");

(async () => {
  try {
    await connectDatabase();
    await User.create({
      name: "Admin",
      email: "admin@hospital.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    });
    console.log("Admin created");
  } catch (error) {
    console.error("Unable to create admin user:", error);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
})();