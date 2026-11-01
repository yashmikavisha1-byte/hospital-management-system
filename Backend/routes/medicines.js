const router = require("express").Router();
const Medicine = require("../models/Medicine");
const Dispense = require("../models/Dispense");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

// Add a medicine (admin)
router.post("/", allow("admin"), async (req, res) => {
  try {
    res.status(201).json(await Medicine.create(req.body));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// View stock (admin, doctor). Use ?search=para to search by name
router.get("/", allow("admin", "doctor"), async (req, res) => {
  const search = req.query.search || "";
  res.json(await Medicine.find({ name: new RegExp(search, "i") }).sort({ name: 1 }));
});

// Medicines running low (must stay above the /:id route)
router.get("/low-stock", allow("admin"), async (req, res) => {
  res.json(await Medicine.find({ $expr: { $lte: ["$quantity", "$reorderLevel"] } }));
});

// Update details or add stock (admin)
router.put("/:id", allow("admin"), async (req, res) => {
  const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!med) return res.status(404).json({ message: "Medicine not found" });
  res.json(med);
});

// Delete (admin)
router.delete("/:id", allow("admin"), async (req, res) => {
  await Medicine.findByIdAndDelete(req.params.id);
  res.json({ message: "Medicine deleted" });
});

// DISPENSE to a patient (admin)
router.post("/:id/dispense", allow("admin"), async (req, res) => {
  const { patientId, quantity } = req.body;
  if (!patientId || !quantity || quantity < 1)
    return res.status(400).json({ message: "patientId and quantity are required" });

  // subtract only if enough stock exists
  const med = await Medicine.findOneAndUpdate(
    { _id: req.params.id, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true }
  );
  if (!med) {
    const exists = await Medicine.findById(req.params.id);
    if (!exists) return res.status(404).json({ message: "Medicine not found" });
    return res.status(400).json({ message: `Not enough stock (only ${exists.quantity} left)` });
  }

  const log = await Dispense.create({
    medicine: med._id,
    patient: patientId,
    quantity,
    totalPrice: quantity * med.price,
    dispensedBy: req.user.name,
  });
  res.status(201).json({ dispense: log, stockLeft: med.quantity });
});

// Dispensing history (admin)
router.get("/dispenses/all", allow("admin"), async (req, res) => {
  res.json(
    await Dispense.find()
      .populate("medicine", "name")
      .populate("patient", "name")
      .sort({ createdAt: -1 })
  );
});

module.exports = router;