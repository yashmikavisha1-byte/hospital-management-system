const router = require("express").Router();
const LabTest = require("../models/LabTest");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

// Doctor orders a test
router.post("/", allow("admin", "doctor"), async (req, res) => {
  try {
    const { patientId, testName } = req.body;
    let doctorId = req.body.doctorId;

    if (req.user.role === "doctor") {
      const d = await Doctor.findOne({ user: req.user.id });
      if (!d) return res.status(400).json({ message: "Doctor profile not found" });
      doctorId = d._id;
    }
    if (!patientId || !doctorId || !testName)
      return res.status(400).json({ message: "patientId, doctorId and testName are required" });

    res.status(201).json(await LabTest.create({ patient: patientId, doctor: doctorId, testName }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// List tests (?status=ordered shows pending ones)
router.get("/", allow("admin", "doctor"), async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(
    await LabTest.find(filter)
      .populate("patient", "name")
      .populate("doctor", "name")
      .sort({ createdAt: -1 })
  );
});

// Patient sees own reports (must stay above /:id)
router.get("/mine", allow("patient"), async (req, res) => {
  const me = await Patient.findOne({ user: req.user.id });
  if (!me) return res.json([]);
  res.json(
    await LabTest.find({ patient: me._id })
      .populate("doctor", "name")
      .sort({ createdAt: -1 })
  );
});

// Admin enters the result
router.put("/:id/result", allow("admin"), async (req, res) => {
  const { result, notes } = req.body;
  if (!result) return res.status(400).json({ message: "result is required" });

  const test = await LabTest.findByIdAndUpdate(
    req.params.id,
    {
      result,
      notes,
      status: "completed",
      completedBy: req.user.name,
      completedAt: new Date(),
    },
    { new: true }
  );
  if (!test) return res.status(404).json({ message: "Test not found" });
  res.json(test);
});

module.exports = router;