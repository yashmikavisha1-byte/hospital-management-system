const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, allow } = require("../middleware/auth");

const makeToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  });

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail }))
      return res.status(400).json({ message: "Email already used" });

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: "patient",
    });
    res.status(201).json({ token: makeToken(user), role: user.role, name: user.name });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(400).json({ message: "Wrong email or password" });

  res.json({ token: makeToken(user), role: user.role, name: user.name });
});

router.post("/create-staff", protect, allow("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
    });
    res.status(201).json({ id: user._id, name: user.name, role: user.role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/me", protect, (req, res) => res.json(req.user));

module.exports = router;