const router = require("express").Router();
const LabReport = require("../models/LabReport");
const Patient = require("../models/Patient");
const { protect, allow } = require("../middleware/auth");

// patient sees own reports
router.get("/mine", protect, async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id || req.user.id });
  if (!patient) return res.json([]);
  const reports = await LabReport.find({ patient: patient._id })
    .populate("patient", "name")
    .sort({ createdAt: -1 });
  res.json(reports);
});

// staff sees all
router.get("/", protect, allow("admin", "doctor", "receptionist"), async (req, res) => {
  const reports = await LabReport.find().populate("patient", "name").sort({ createdAt: -1 });
  res.json(reports);
});

router.post("/", protect, allow("admin", "doctor", "receptionist"), async (req, res) => {
  try {
    const { patientId, testName, result, status } = req.body;
    const report = await LabReport.create({
      patient: patientId,
      testName,
      result,
      status,
      orderedBy: req.user.name,
    });
    res.status(201).json(await report.populate("patient", "name"));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;