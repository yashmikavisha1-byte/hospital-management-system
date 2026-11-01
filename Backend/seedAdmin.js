require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./models/User");

async function seedAdmin() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = String(process.env.ADMIN_NAME || "Admin").trim();

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be configured to create or reset an admin account");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set ADMIN_EMAIL to a valid email address in Backend/.env");
  }
  if (password.length < 12) {
    throw new Error("Set ADMIN_PASSWORD to a password with at least 12 characters in Backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email });
  if (user && user.role !== "admin") {
    throw new Error("That email belongs to a non-admin account. Choose a different ADMIN_EMAIL.");
  }

  if (user) {
    user.password = await bcrypt.hash(password, 12);
    if (!user.name) user.name = name;
    await user.save();
    console.log("Admin password reset successfully.");
  } else {
    await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "admin",
    });
    console.log("Admin account created successfully.");
  }
}

seedAdmin()
  .catch((error) => {
    console.error("Unable to create or reset admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
