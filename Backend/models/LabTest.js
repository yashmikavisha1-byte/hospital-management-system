const mongoose = require("mongoose");

const labTestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    testName: { type: String, required: true }, // "Blood sugar"
    status: { type: String, enum: ["ordered", "completed"], default: "ordered" },
    result: { type: String, default: "" },
    notes: { type: String, default: "" },
    completedBy: String,
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabTest", labTestSchema);