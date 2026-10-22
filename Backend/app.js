require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { connectDatabase } = require("./db");
const { ensureDevelopmentUsers } = require("./seedUsers");
const User = require("./models/User");

const app = express();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Allowed websites: any localhost port, plus the addresses in CLIENT_URL
const allowed = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || allowed.includes(origin))
        return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/patients", require("./routes/patients"));
app.use("/api/doctors", require("./routes/doctors"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/records", require("./routes/records"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/medicines", require("./routes/medicines"));
app.use("/api/lab", require("./routes/lab"));
app.use("/api/wards", require("./routes/wards"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Creates the first admin if none exists. Falls back to the default hospital admin
// so the app can log in immediately without custom environment configuration.
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@hospital.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";

  if (await User.findOne({ role: "admin" })) return;
  if (await User.findOne({ email })) return;

  await User.create({
    name: "Admin",
    email,
    password: await bcrypt.hash(password, 10),
    role: "admin",
  });
  console.log(`Admin account created for ${email}`);
}

async function initialize() {
  const { inMemory } = await connectDatabase();
  if (inMemory) await ensureDevelopmentUsers();
  await ensureAdmin();
}

module.exports = { app, initialize };
