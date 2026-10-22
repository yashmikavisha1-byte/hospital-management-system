const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { protect, allow } = require("../middleware/auth");

const googleOAuthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

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
  if (!user || !user.password || !(await bcrypt.compare(password, user.password)))
    return res.status(400).json({ message: "Wrong email or password" });

  res.json({ token: makeToken(user), role: user.role, name: user.name });
});

router.post("/google", async (req, res) => {
  const { code, role } = req.body || {};
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ message: "Google sign-in is not configured" });
  }
  if (!["admin", "doctor", "patient"].includes(role)) {
    return res.status(400).json({ message: "Choose a supported account role" });
  }
  if (typeof code !== "string" || !code) {
    return res.status(400).json({ message: "Google authorization code is required" });
  }

  let payload;
  try {
    const { tokens } = await googleOAuthClient.getToken(code);
    if (!tokens.id_token) {
      return res.status(401).json({ message: "Google did not verify this account" });
    }
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: "Google sign-in could not be verified. Please try again." });
  }

  if (!payload?.sub || !payload.email || !payload.email_verified) {
    return res.status(401).json({ message: "Use a Google account with a verified email address" });
  }

  const email = payload.email.trim().toLowerCase();
  try {
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) user = await User.findOne({ email });

    if (user) {
      if (user.role !== role) {
        return res.status(403).json({ message: `This Google account is not registered as ${role}` });
      }
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(409).json({ message: "This email is linked to a different Google account" });
      }
      if (!user.googleId) {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {
      if (role !== "patient") {
        return res.status(403).json({ message: `No existing ${role} account is registered for this Google email` });
      }
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        role: "patient",
      });
    }

    res.json({ token: makeToken(user), role: user.role, name: user.name });
  } catch (error) {
    console.error("Unable to complete Google sign-in:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "This Google account is already linked to another user" });
    }
    res.status(500).json({ message: "Unable to complete Google sign-in" });
  }
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