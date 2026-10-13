require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { connectDatabase } = require("./db");
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

// Creates the first admin if none exists (uses ADMIN_EMAIL and ADMIN_PASSWORD)
async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  if (await User.findOne({ role: "admin" })) return;
  await User.create({
    name: "Admin",
    email: ADMIN_EMAIL,
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    role: "admin",
  });
  console.log("Admin account created");
}

async function initialize() {
  await connectDatabase();
  await ensureAdmin();
}

if (require.main === module) {
  initialize()
    .then(() => {
      app.listen(process.env.PORT || 5000, () =>
        console.log(`Server running on port ${process.env.PORT || 5000}`)
      );
    })
    .catch((err) => {
      console.error("Database connection failed:", err);
      process.exit(1);
    });
}

module.exports = { app, initialize };