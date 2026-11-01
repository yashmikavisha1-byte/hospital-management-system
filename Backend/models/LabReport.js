const mongoose = require("mongoose");

const labReportSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    testName: { type: String, required: true, trim: true },
    result: { type: String, default: "" },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    orderedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabReport", labReportSchema);