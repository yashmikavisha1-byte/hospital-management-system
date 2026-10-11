require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDatabase } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/patients", require("./routes/patients"));
app.use("/api/doctors", require("./routes/doctors"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/records", require("./routes/records"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/medicines", require("./routes/medicines"));
app.use("/api/lab", require("./routes/lab"));
app.use("/api/wards", require("./routes/wards"));
app.use("/api/dashboard", require("./routes/dashboard"));

connectDatabase()
  .then(() => {
    app.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });