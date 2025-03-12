
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect("mongodb+srv://ScheduleSync:aman1047@userdata.j649i.mongodb.net/ScheduleSync?retryWrites=true&w=majority&appName=userdata", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

//  Session Setup
app.use(
  session({
    secret: "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000, httpOnly: true, secure: process.env.NODE_ENV === "production" },
  })
);

//  Middleware to check if user is logged in
const isLoggedIn = (req, res, next) => {
  if (req.session.user) return next();
  res.status(401).json({ message: "Unauthorized access" });
};

//  User Schema (Default role: "user")
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});

const User = mongoose.model("User", UserSchema);

//  Serve Static Files
app.use(express.static(__dirname));
app.use("/assets", express.static(path.join(__dirname, "assets")));

//  Homepage Route (Login/Register Page)
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.sendFile(path.join(__dirname, "register.html"));
});

//  Register Route
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // User role is automatically "user"
    const newUser = new User({ username, email, password: hashedPassword });

    await newUser.save();

   res.redirect("/index.html")
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Error during signup. Please try again." });
  }
});

//  Login Route
app.post("/login", async (req, res) => {
  console.log("login",req.body);
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const user = await User.findOne({ username });
    console.log(user);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid username or password." });
    }

    req.session.user = { username: user.username, userId: user._id, role: user.role };

    res.json({ success:true,message: "Login successful", user: req.session.user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Error during login. Please try again." });
  }
});

//  Dashboard Route 
app.get("/dashboard", isLoggedIn, (req, res) => {
  res.json({ message: `Welcome, ${req.session.user.username}!`, user: req.session.user });
});

//  Logout Route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out successfully." });
});

const PORT = 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));