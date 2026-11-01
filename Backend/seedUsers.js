if (require.main === module) require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./models/User");

// Test accounts (for development only - change these passwords later)
const USERS = [
  { name: "Admin", email: "admin@gmail.com", password: "admin123", role: "admin" },
  { name: "Doctor", email: "doctor@gmail.com", password: "doctor123", role: "doctor" },
  { name: "Patient", email: "patient@gmail.com", password: "patient123", role: "patient" },
];

async function ensureDevelopmentUsers() {
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });

    if (existing) {
      if (existing.role !== u.role) {
        throw new Error(`${u.email} already exists with role "${existing.role}", expected "${u.role}"`);
      }
      continue;
    }

    await User.create({
      name: u.name,
      email: u.email,
      password: await bcrypt.hash(u.password, 12),
      role: u.role,
    });
    console.log(`Development ${u.role} account ready: ${u.email}`);
  }
}

async function seedUsers() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in Backend/.env");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    await ensureDevelopmentUsers();
  } catch (error) {
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new Error(
        "Could not reach MongoDB. Check the Atlas hostname in Backend/.env or start a local MongoDB server."
      );
    }
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedUsers()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { ensureDevelopmentUsers };