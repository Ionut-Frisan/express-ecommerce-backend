const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const crypto = require("crypto");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const jwt = require("jsonwebtoken");

/**
 * @desc    Register user
 * @route   POST /api/v1/auth/register
 *
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role,
  });


  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 *
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   POST api/v1/auth/me
 *
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Log user out/ clear cookie
 * @route   Get api/v1/auth/logout
 *
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Update user details
 * @route   PUT /api/v1/auth/updateDetails
 *
 * @access  Private
 */
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user password
 * @route   PUT /api/v1/auth/updatePassword
 *
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Password is incorrect", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgotPassword
 *
 * @access  public
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse("There is no user with this email", 404));
  }

  // Get reset token
  const resetToken = await user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/resetPassword/${resetToken}`;

  const message = `You are receiving this email because you ( or someone else ) has requested the reset of a password. Please make a PUT request to: ${resetURL}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password reset token",
      message,
    });
    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.log(err);
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;

    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse("Email could not be sent", 500));
  }
});

/**
 * @desc    Reset password
 * @route   Put /api/v1/auth/resetPassword/:resettoken
 *
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse("Invalid token", 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

exports.checkToken = asyncHandler(async (req, res, next) => {
  let token;

  if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.json({status: false, message: 'Not authenticated'}).status(401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const JWTTimestamp = decoded.exp * 1000;
    const currentTimestamp = new Date().getTime();

    if (JWTTimestamp < currentTimestamp)
      return res.json({status: false, message: 'Expired'}).status(401);

    const user = await User.findById(decoded.id);
    if (!user)
      return res.json({status: false, message: 'Invalid token'}).status(401);
    res.json({status: true, message: 'Valid token'}).status(200);

  } catch (err) {
    return res.json({status: false, message: "Error"}).status(500);
  }
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    secret: process.env.JWT_SECRET,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({ success: true, token: token });
};
