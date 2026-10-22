const router = require("express").Router();
const Patient = require("../models/Patient");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

// ---- Patient's own profile (must stay ABOVE the "/:id" routes) ----
router.get("/me", allow("patient"), async (req, res) => {
  const userId = req.user._id || req.user.id;
  const patient = await Patient.findOne({ user: userId });
  res.json(patient); // null when no profile yet
});

router.post("/me", allow("patient"), async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const exists = await Patient.findOne({ user: userId });
    if (exists) return res.status(400).json({ message: "Profile already exists" });

    const { name, age, gender, phone, address, bloodGroup } = req.body;
    const patient = await Patient.create({
      name, age, gender, phone, address, bloodGroup,
      user: userId,
    });
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Register a patient
router.post("/", allow("admin", "receptionist"), async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// List all patients (search with ?search=name)
router.get("/", allow("admin", "receptionist", "doctor"), async (req, res) => {
  const search = req.query.search || "";
  const patients = await Patient.find({ name: new RegExp(search, "i") }).sort({
    createdAt: -1,
  });
  res.json(patients);
});

// One patient with history
router.get("/:id", allow("admin", "receptionist", "doctor"), async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  res.json(patient);
});

// Update details
router.put("/:id", allow("admin", "receptionist"), async (req, res) => {
  const { history, ...details } = req.body; // history cannot be overwritten here
  const patient = await Patient.findByIdAndUpdate(req.params.id, details, {
    new: true,
    runValidators: true,
  });
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  res.json(patient);
});

// Add a history note (doctor or admin)
router.post("/:id/history", allow("admin", "doctor"), async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  patient.history.push({ note: req.body.note, addedBy: req.user.name });
  await patient.save();
  res.json(patient);
});

// Delete (admin only)
router.delete("/:id", allow("admin"), async (req, res) => {
  await Patient.findByIdAndDelete(req.params.id);
  res.json({ message: "Patient deleted" });
});

module.exports = router;