const router = require("express").Router();
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const Bill = require("../models/Bill");
const Medicine = require("../models/Medicine");
const Ward = require("../models/Ward");
const Admission = require("../models/Admission");
const { protect, allow } = require("../middleware/auth");

router.use(protect, allow("admin"));

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// money received between two moments (sum of payments)
async function revenueBetween(from, to) {
  const r = await Bill.aggregate([
    { $unwind: "$payments" },
    { $match: { "payments.date": { $gte: from, $lt: to } } },
    { $group: { _id: null, total: { $sum: "$payments.amount" } } },
  ]);
  return r[0] ? r[0].total : 0;
}

// Numbers for the dashboard cards
router.get("/summary", async (req, res) => {
  const start = startOfDay(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [
    totalPatients,
    newPatientsToday,
    totalDoctors,
    appointmentsToday,
    admittedNow,
    revenueToday,
    revenueAll,
    unpaid,
    wards,
    lowStock,
  ] = await Promise.all([
    Patient.countDocuments(),
    Patient.countDocuments({ createdAt: { $gte: start, $lt: end } }),
    Doctor.countDocuments(),
    Appointment.countDocuments({ date: fmt(start), status: { $ne: "cancelled" } }),
    Admission.countDocuments({ status: "admitted" }),
    revenueBetween(start, end),
    Bill.aggregate([{ $group: { _id: null, total: { $sum: "$paid" } } }]),
    Bill.aggregate([
      { $match: { status: { $ne: "paid" } } },
      { $group: { _id: null, total: { $sum: { $subtract: ["$total", "$paid"] } } } },
    ]),
    Ward.find(),
    Medicine.countDocuments({ $expr: { $lte: ["$quantity", "$reorderLevel"] } }),
  ]);

  const totalBeds = wards.reduce((s, w) => s + w.beds.length, 0);
  const freeBeds = wards.reduce(
    (s, w) => s + w.beds.filter((b) => b.status === "available").length,
    0
  );

  res.json({
    date: fmt(start),
    totalPatients,
    newPatientsToday,
    totalDoctors,
    appointmentsToday,
    admittedNow,
    revenueToday,
    totalRevenue: revenueAll[0] ? revenueAll[0].total : 0,
    unpaidBalance: unpaid[0] ? unpaid[0].total : 0,
    totalBeds,
    availableBeds: freeBeds,
    lowStockMedicines: lowStock,
  });
});

// Last 7 days, ready for a chart
router.get("/charts", async (req, res) => {
  const today = startOfDay(new Date());
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const data = await Promise.all(
    days.map(async (d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const [appointments, newPatients, revenue] = await Promise.all([
        Appointment.countDocuments({ date: fmt(d), status: { $ne: "cancelled" } }),
        Patient.countDocuments({ createdAt: { $gte: d, $lt: next } }),
        revenueBetween(d, next),
      ]);
      return { date: fmt(d), appointments, newPatients, revenue };
    })
  );
  res.json(data);
});

module.exports = router;