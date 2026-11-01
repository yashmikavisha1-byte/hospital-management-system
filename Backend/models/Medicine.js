const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "" }, // "Antibiotic"
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 }, // per unit
    expiryDate: { type: String, default: "" }, // "2027-05-30"
    reorderLevel: { type: Number, default: 10 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medicine", medicineSchema);