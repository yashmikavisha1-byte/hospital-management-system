require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./models/User");
const Doctor = require("./models/Doctor");
const Patient = require("./models/Patient");

// Creates (or resets) a test doctor and a test patient, with their profiles.
async function ensureUser({ name, email, password, role }) {
  const hashed = await bcrypt.hash(password, 12);
  let user = await User.findOne({ email });
  if (user) {
    user.password = hashed;
    user.role = role;
    await user.save();
  } else {
    user = await User.create({ name, email, password: hashed, role });
  }
  return user;
}

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing in Backend/.env");
  await mongoose.connect(process.env.MONGO_URI);

  // ---- Doctor ----
  const doctorUser = await ensureUser({
    name: "Dr. Nimal",
    email: "doctor@gmail.com",
    password: "doctor123",
    role: "doctor",
  });
  if (!(await Doctor.findOne({ user: doctorUser._id }))) {
    await Doctor.create({
      user: doctorUser._id,
      name: "Dr. Nimal",
      specialization: "General Physician",
      phone: "0771234567",
      schedule: [
        { day: "Mon", startTime: "09:00", endTime: "13:00" },
        { day: "Wed", startTime: "09:00", endTime: "13:00" },
      ],
    });
  }
  console.log("Doctor ready:  doctor@gmail.com / doctor123");

  // ---- Patient ----
  const patientUser = await ensureUser({
    name: "Test Patient",
    email: "patient@gmail.com",
    password: "patient123",
    role: "patient",
  });
  if (!(await Patient.findOne({ user: patientUser._id }))) {
    await Patient.create({
      name: "Test Patient",
      age: 25,
      gender: "female",
      phone: "0779876543",
      user: patientUser._id,
    });
  }
  console.log("Patient ready: patient@gmail.com / patient123");
}

run()
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());