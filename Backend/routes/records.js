const router = require("express").Router();
const Patient = require("../models/Patient");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

// Get patient medical record/history
router.get("/:patientId", allow("admin", "receptionist", "doctor", "patient"), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (req.user.role === "patient") {
      const patientUserId = String(patient.user || "");
      if (!patientUserId || patientUserId !== String(req.user.id)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(patient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add a record note
router.post("/:patientId", allow("admin", "doctor"), async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ message: "Record note is required" });
    }

    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.history.push({
      note: note.trim(),
      addedBy: req.user.name,
      date: new Date(),
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
