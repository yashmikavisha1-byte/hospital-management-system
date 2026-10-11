const router = require("express").Router();
const Ward = require("../models/Ward");
const Admission = require("../models/Admission");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

// Admin creates a ward; beds are generated automatically (1..bedCount)
router.post("/", allow("admin"), async (req, res) => {
  try {
    const { name, type, bedCount } = req.body;
    if (!name || !bedCount || bedCount < 1)
      return res.status(400).json({ message: "name and bedCount are required" });

    const beds = Array.from({ length: bedCount }, (_, i) => ({ number: i + 1 }));
    res.status(201).json(await Ward.create({ name, type, beds }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// View wards with bed availability
router.get("/", allow("admin", "receptionist", "doctor"), async (req, res) => {
  const wards = await Ward.find().sort({ name: 1 });
  res.json(
    wards.map((w) => {
      const available = w.beds.filter((b) => b.status === "available").length;
      return {
        _id: w._id,
        name: w.name,
        type: w.type,
        totalBeds: w.beds.length,
        availableBeds: available,
        occupiedBeds: w.beds.length - available,
        beds: w.beds,
      };
    })
  );
});

// ADMIT a patient: the first free bed is assigned automatically
router.post("/admit", allow("admin", "receptionist"), async (req, res) => {
  try {
    const { patientId, wardId, doctorId, reason } = req.body;
    if (!patientId || !wardId)
      return res.status(400).json({ message: "patientId and wardId are required" });

    if (await Admission.findOne({ patient: patientId, status: "admitted" }))
      return res.status(400).json({ message: "Patient is already admitted" });

    const ward = await Ward.findById(wardId);
    if (!ward) return res.status(404).json({ message: "Ward not found" });

    const free = ward.beds.find((b) => b.status === "available");
    if (!free) return res.status(400).json({ message: "No free beds in this ward" });

    // take the bed only if it is still free (prevents double booking)
    const updated = await Ward.findOneAndUpdate(
      { _id: wardId, beds: { $elemMatch: { number: free.number, status: "available" } } },
      { $set: { "beds.$.status": "occupied", "beds.$.patient": patientId } },
      { new: true }
    );
    if (!updated)
      return res.status(409).json({ message: "Bed was just taken, please try again" });

    const admission = await Admission.create({
      patient: patientId,
      doctor: doctorId,
      ward: wardId,
      bedNumber: free.number,
      reason,
      admittedBy: req.user.name,
    });
    res.status(201).json(admission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DISCHARGE: the bed becomes available again
router.put("/admissions/:id/discharge", allow("admin", "receptionist", "doctor"), async (req, res) => {
  const admission = await Admission.findById(req.params.id);
  if (!admission) return res.status(404).json({ message: "Admission not found" });
  if (admission.status === "discharged")
    return res.status(400).json({ message: "Already discharged" });

  admission.status = "discharged";
  admission.dischargedAt = new Date();
  await admission.save();

  await Ward.updateOne(
    { _id: admission.ward, "beds.number": admission.bedNumber },
    { $set: { "beds.$.status": "available", "beds.$.patient": null } }
  );
  res.json(admission);
});

// List admissions (?status=admitted shows current patients)
router.get("/admissions/all", allow("admin", "receptionist", "doctor"), async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(
    await Admission.find(filter)
      .populate("patient", "name phone")
      .populate("doctor", "name")
      .populate("ward", "name type")
      .sort({ admittedAt: -1 })
  );
});

module.exports = router;