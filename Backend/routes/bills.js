const router = require("express").Router();
const Bill = require("../models/Bill");
const Patient = require("../models/Patient");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

// recalculate total, paid and status
function recalc(bill) {
  bill.total = bill.items.reduce((sum, i) => sum + i.amount, 0);
  bill.paid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
  if (bill.paid <= 0) bill.status = "unpaid";
  else if (bill.paid < bill.total) bill.status = "partial";
  else bill.status = "paid";
}

// GENERATE a bill
router.post("/", allow("admin", "receptionist"), async (req, res) => {
  try {
    const { patientId, appointmentId, items } = req.body;
    if (!patientId || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "patientId and items are required" });

    const bill = new Bill({
      patient: patientId,
      appointment: appointmentId,
      items,
      createdBy: req.user.name,
    });
    recalc(bill);
    await bill.save();
    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// LIST all bills (?status=unpaid to filter)
router.get("/", allow("admin", "receptionist"), async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const bills = await Bill.find(filter)
    .populate("patient", "name phone")
    .sort({ createdAt: -1 });
  res.json(bills);
});

// Patient sees only their own bills
router.get("/mine", allow("patient"), async (req, res) => {
  const me = await Patient.findOne({ user: req.user.id });
  if (!me) return res.json([]);
  res.json(await Bill.find({ patient: me._id }).sort({ createdAt: -1 }));
});

// ONE bill (patients can only open their own)
router.get("/:id", allow("admin", "receptionist", "patient"), async (req, res) => {
  const bill = await Bill.findById(req.params.id).populate("patient", "name phone");
  if (!bill) return res.status(404).json({ message: "Bill not found" });

  if (req.user.role === "patient") {
    const me = await Patient.findOne({ user: req.user.id });
    if (!me || String(bill.patient._id) !== String(me._id))
      return res.status(403).json({ message: "Access denied" });
  }
  res.json(bill);
});

// RECORD a payment
router.post("/:id/pay", allow("admin", "receptionist"), async (req, res) => {
  const { amount, method } = req.body;
  const bill = await Bill.findById(req.params.id);
  if (!bill) return res.status(404).json({ message: "Bill not found" });

  if (!amount || amount <= 0)
    return res.status(400).json({ message: "Enter a valid amount" });
  if (amount > bill.total - bill.paid)
    return res
      .status(400)
      .json({ message: `Amount is more than the balance (${bill.total - bill.paid})` });

  bill.payments.push({ amount, method, receivedBy: req.user.name });
  recalc(bill);
  await bill.save();
  res.json(bill);
});

module.exports = router;