const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

const User = require("../models/user");
const { createToken, checkToken } = require("../utils/token");

const findUserByEmail = async (email) => {
  let user;

  try {
    user = await User.findOne({ email });
  } catch (error) {
    return next(
      new Error("[ERROR][USERS] Could not find user with this email:", +error)
    );
  }

  return user;
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.json({ message: "Access denied, invalid Entries.", access: false });
    return next();
  }

  const user = await findUserByEmail(email);
  if (!user) {
    res.json({ message: "Access denied", access: false });
    return next();
  }

  const decryptedPassword = await bcrypt.compare(password, user.password);

  if (!decryptedPassword) {
    res.json({ message: "Access denied", access: false });
    return next();
  }

  let token = createToken(user.id);

  res.json({
    message: "Access granted",
    access: true,
    user: {
      id: user.id,
      username: user.username,
      token,
    },
  });
};

const signup = async (req, res, next) => {
  console.log(req.body);
  if (!req.body) {
    res.json({ message: "Bad request", access: false });
    return next();
  }
  const { email, password, username } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.json({ message: "Access denied, invalid Entries.", access: false });
    return next();
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    res.json({ message: "Email in use. Use another email", access: false });
    return next();
  }

  const hashedPassword = await bcrypt.hash(password, 8);

  const newUser = new User({ email, password: hashedPassword, username });

  try {
    await newUser.save();
  } catch (error) {
    return next(new Error("[ERROR][USERS] Could not save user in db", +error));
  }

  let token = createToken(newUser.id);

  res.json({
    message: "Access granted",
    access: true,
    user: { id: newUser.id, username: newUser.username, token },
  });
};

const guest = async (req, res, next) => {
  const randomUsername = `Guest${Math.floor(Math.random() * 99999) + 1}`;

  const newGuest = new User({ username: randomUsername });

  try {
    await newGuest.save();
  } catch (error) {
    return next(new Error("[ERROR][USERS] Could not save guest to DB", +error));
  }

  res.json({
    message: "Guest - access granted",
    access: true,
    user: { id: newGuest.id, username: newGuest.username },
  });
};

exports.login = login;
exports.signup = signup;
exports.guest = guest;
