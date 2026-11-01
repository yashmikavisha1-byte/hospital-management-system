const router = require("express").Router();
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { protect, allow } = require("../middleware/auth");

router.use(protect);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Returns an error text if the slot is not possible, otherwise null
async function checkSlot(doctorId, date, time, ignoreId) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return "Doctor not found";

  if (doctor.schedule.length > 0) {
    const day = DAYS[new Date(date + "T00:00:00").getDay()];
    const ok = doctor.schedule.some(
      (s) => s.day === day && time >= s.startTime && time < s.endTime
    );
    if (!ok) return `Doctor is not available on ${day} at ${time}`;
  }

  const clash = await Appointment.findOne({
    doctor: doctorId,
    date,
    time,
    status: "booked",
    _id: { $ne: ignoreId || null },
  });
  if (clash) return "That time slot is already booked";
  return null;
}

// Patients may only touch their own appointments
async function canTouch(req, appt) {
  if (req.user.role !== "patient") return true;
  const me = await Patient.findOne({ user: req.user.id });
  return me && String(appt.patient) === String(me._id);
}

// BOOK
router.post("/", allow("admin", "receptionist", "patient"), async (req, res) => {
  try {
    let { patientId, doctorId, date, time } = req.body;

    if (req.user.role === "patient") {
      const me = await Patient.findOne({ user: req.user.id });
      if (!me)
        return res.status(400).json({ message: "Create your patient profile first" });
      patientId = me._id;
    }
    if (!patientId || !doctorId || !date || !time)
      return res.status(400).json({ message: "patientId, doctorId, date and time are required" });

    const problem = await checkSlot(doctorId, date, time);
    if (problem) return res.status(400).json({ message: problem });

    const appt = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      date,
      time,
      bookedBy: req.user.name,
    });
    res.status(201).json(appt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// LIST (each role sees what it should see)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.date) filter.date = req.query.date;

  if (req.user.role === "doctor") {
    const d = await Doctor.findOne({ user: req.user.id });
    if (!d) return res.json([]);
    filter.doctor = d._id;
  }
  if (req.user.role === "patient") {
    const p = await Patient.findOne({ user: req.user.id });
    if (!p) return res.json([]);
    filter.patient = p._id;
  }

  const list = await Appointment.find(filter)
    .populate("patient", "name phone")
    .populate("doctor", "name specialization")
    .sort({ date: 1, time: 1 });
  res.json(list);
});

// CANCEL
router.put("/:id/cancel", allow("admin", "receptionist", "patient"), async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  if (!(await canTouch(req, appt)))
    return res.status(403).json({ message: "Access denied" });

  appt.status = "cancelled";
  await appt.save();
  res.json(appt);
});

// RESCHEDULE
router.put("/:id/reschedule", allow("admin", "receptionist", "patient"), async (req, res) => {
  const { date, time } = req.body;
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  if (!(await canTouch(req, appt)))
    return res.status(403).json({ message: "Access denied" });
  if (appt.status !== "booked")
    return res.status(400).json({ message: "Only booked appointments can be rescheduled" });

  const problem = await checkSlot(appt.doctor, date, time, appt._id);
  if (problem) return res.status(400).json({ message: problem });

  appt.date = date;
  appt.time = time;
  await appt.save();
  res.json(appt);
});

// COMPLETE (doctor after the visit)
router.put("/:id/complete", allow("admin", "doctor"), async (req, res) => {
  const appt = await Appointment.findByIdAndUpdate(
    req.params.id,
    { status: "completed" },
    { new: true }
  );
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  res.json(appt);
});

module.exports = router;