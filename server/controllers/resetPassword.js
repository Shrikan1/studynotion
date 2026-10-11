const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const bcrypt = require("bcrypt")
const crypto = require("crypto")

exports.resetPasswordToken = async (req, res) => {
  try {
    const email = req.body.email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      })
    }

    const user = await User.findOne({ email: email })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `This Email: ${email} is not registered with us. Enter a valid email.`,
      })
    }

    const token = crypto.randomBytes(20).toString("hex")

    await User.findOneAndUpdate(
      { email: email },
      {
        token: token,
        resetPasswordExpires: Date.now() + 3600000,
      },
      { new: true }
    )

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:3000"

    const url = `${frontendUrl}/update-password/${token}`

    await mailSender(
      email,
      "Password Reset",
      `Your link for password reset is ${url}. Please click this url to reset your password. This link is valid for 1 hour.`
    )

    return res.status(200).json({
      success: true,
      message:
        "Email sent successfully. Please check your email to continue further.",
    })
  } catch (error) {
    console.error("Reset password token error:", error)
    return res.status(500).json({
      error: error.message,
      success: false,
      message: "An error occurred while sending the reset email",
    })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { password, confirmPassword, token } = req.body

    if (!password || !confirmPassword || !token) {
      return res.status(400).json({
        success: false,
        message: "All fields (password, confirmPassword, token) are required",
      })
    }

    if (confirmPassword !== password) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm Password do not match",
      })
    }

    const userDetails = await User.findOne({ token: token })
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "Token is invalid",
      })
    }

    if (!(userDetails.resetPasswordExpires > Date.now())) {
      return res.status(403).json({
        success: false,
        message: "Token is expired. Please regenerate your token.",
      })
    }

    const encryptedPassword = await bcrypt.hash(password, 10)
    await User.findOneAndUpdate(
      { token: token },
      {
        password: encryptedPassword,
        token: undefined,
        resetPasswordExpires: undefined,
      },
      { new: true }
    )

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return res.status(500).json({
      error: error.message,
      success: false,
      message: "An error occurred while updating the password",
    })
  }
}
