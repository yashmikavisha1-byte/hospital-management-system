const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

// Admin creates a doctor: login account + profile in one step
router.post("/", allow("admin"), async (req, res) => {
  try {
    const { name, email, password, specialization, phone, schedule } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already used" });

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "doctor",
    });
    const doctor = await Doctor.create({
      user: user._id,
      name,
      specialization,
      phone,
      schedule,
    });
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Anyone logged in can view doctors (patients need it to book)
router.get("/", async (req, res) => {
  const filter = req.query.specialization
    ? { specialization: new RegExp(req.query.specialization, "i") }
    : {};
  res.json(await Doctor.find(filter).sort({ name: 1 }));
});

router.get("/:id", async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ message: "Doctor not found" });
  res.json(doctor);
});

// Admin updates profile or schedule
router.put("/:id", allow("admin"), async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!doctor) return res.status(404).json({ message: "Doctor not found" });
  res.json(doctor);
});

// Admin deletes doctor and their login
router.delete("/:id", allow("admin"), async (req, res) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (doctor) await User.findByIdAndDelete(doctor.user);
  res.json({ message: "Doctor deleted" });
});

module.exports = router;