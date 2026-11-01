const mongoose = require("mongoose");

const admissionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    ward: { type: mongoose.Schema.Types.ObjectId, ref: "Ward", required: true },
    bedNumber: { type: Number, required: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["admitted", "discharged"], default: "admitted" },
    admittedAt: { type: Date, default: Date.now },
    dischargedAt: Date,
    admittedBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admission", admissionSchema);