const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    phone: { type: String, required: true },
    address: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional login account
    history: [
      {
        note: String,
        addedBy: String,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);