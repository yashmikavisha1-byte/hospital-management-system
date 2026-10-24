require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { connectDatabase } = require("./db");
const { ensureDevelopmentUsers } = require("./seedUsers");
const User = require("./models/User");
const Patient = require("./models/Patient");

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

async function ensureBootstrapPatient() {
  const email = String(process.env.BOOTSTRAP_PATIENT_EMAIL || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PATIENT_PASSWORD || "";
  const name = String(process.env.BOOTSTRAP_PATIENT_NAME || "Patient").trim();
  const age = Number(process.env.BOOTSTRAP_PATIENT_AGE);
  const gender = process.env.BOOTSTRAP_PATIENT_GENDER;
  const phone = String(process.env.BOOTSTRAP_PATIENT_PHONE || "").trim();
  const address = String(process.env.BOOTSTRAP_PATIENT_ADDRESS || "").trim();
  const configured = [
    email,
    password,
    process.env.BOOTSTRAP_PATIENT_AGE,
    gender,
    phone,
  ];

  if (configured.every((value) => !value)) return;
  if (configured.some((value) => !value)) {
    throw new Error(
      "Configure BOOTSTRAP_PATIENT_EMAIL, BOOTSTRAP_PATIENT_PASSWORD, BOOTSTRAP_PATIENT_AGE, BOOTSTRAP_PATIENT_GENDER, and BOOTSTRAP_PATIENT_PHONE together"
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("BOOTSTRAP_PATIENT_EMAIL must be a valid email address");
  }
  if (password.length < 12) {
    throw new Error("BOOTSTRAP_PATIENT_PASSWORD must be at least 12 characters");
  }
  if (!name) throw new Error("BOOTSTRAP_PATIENT_NAME must not be empty");
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    throw new Error("BOOTSTRAP_PATIENT_AGE must be between 1 and 120");
  }
  if (!["male", "female"].includes(gender)) {
    throw new Error('BOOTSTRAP_PATIENT_GENDER must be "male" or "female"');
  }

  let user = await User.findOne({ email });
  if (user && user.role !== "patient") {
    throw new Error("BOOTSTRAP_PATIENT_EMAIL belongs to a non-patient account");
  }
  if (!user) {
    user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "patient",
    });
    console.log(`Bootstrap patient account created for ${email}`);
  } else if (!user.password) {
    user.password = await bcrypt.hash(password, 12);
    await user.save();
    console.log(`Password sign-in enabled for bootstrap patient ${email}`);
  }

  const profile = await Patient.findOne({ user: user._id });
  if (!profile) {
    await Patient.create({
      name: user.name,
      age,
      gender,
      phone,
      address,
      user: user._id,
    });
    console.log(`Bootstrap patient profile created for ${email}`);
  }
}

async function initialize() {
  const { inMemory } = await connectDatabase();
  if (inMemory) await ensureDevelopmentUsers();
  await ensureAdmin();
  await ensureBootstrapPatient();
}

module.exports = { app, initialize };
