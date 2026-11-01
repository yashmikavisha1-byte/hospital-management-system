const mongoose = require("mongoose");

const wardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: ["general", "icu", "private", "maternity"],
      default: "general",
    },
    beds: [
      {
        number: { type: Number, required: true },
        status: { type: String, enum: ["available", "occupied"], default: "available" },
        patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", default: null },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ward", wardSchema);