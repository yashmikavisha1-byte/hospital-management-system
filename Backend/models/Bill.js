const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    items: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    total: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    payments: [
      {
        amount: { type: Number, required: true },
        method: { type: String, enum: ["cash", "card", "online"], default: "cash" },
        date: { type: Date, default: Date.now },
        receivedBy: String,
      },
    ],
    createdBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);