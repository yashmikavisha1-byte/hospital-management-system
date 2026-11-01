const mongoose = require("mongoose");

const dispenseSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true },
    dispensedBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispense", dispenseSchema);