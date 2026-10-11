const bcrypt = require("bcrypt")
const User = require("../models/User")
const OTP = require("../models/OTP")
const jwt = require("jsonwebtoken")
const otpGenerator = require("otp-generator")
const mailSender = require("../utils/mailSender")
const { passwordUpdated } = require("../mail/templates/passwordUpdate")
const Profile = require("../models/Profile")
require("dotenv").config()

// Signup Controller for Registering Users
exports.signup = async (req, res) => {
  try {
    // Destructure fields from the request body
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      accountType,
      contactNumber,
      otp,
    } = req.body

    // Check if All Details are present
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !otp
    ) {
      return res.status(403).json({
        success: false,
        message: "All fields are required",
      })
    }

    // Check if password and confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Password and Confirm Password do not match. Please try again.",
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Please sign in to continue.",
      })
    }

    // Find the most recent OTP for the email
    const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1)
    if (response.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid or has expired",
      })
    } else if (otp !== response[0].otp) {
      return res.status(400).json({
        success: false,
        message: "The OTP is not valid",
      })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Set approval status based on account type
    const approved = accountType === "Instructor" ? false : true

    // Create the Additional Profile For User
    const profileDetails = await Profile.create({
      gender: null,
      dateOfBirth: null,
      about: null,
      contactNumber: null,
    })

    const avatarUrl = `https://api.dicebear.com/5.x/initials/svg?seed=${encodeURIComponent(
      `${firstName} ${lastName}`
    )}`

    const user = await User.create({
      firstName,
      lastName,
      email,
      contactNumber,
      password: hashedPassword,
      accountType: accountType,
      approved: approved,
      additionalDetails: profileDetails._id,
      image: avatarUrl,
    })

    return res.status(200).json({
      success: true,
      user,
      message: "User registered successfully",
    })
  } catch (error) {
    console.error("Signup error:", error)
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again.",
      error: error.message,
    })
  }
}

// Login controller for authenticating users
exports.login = async (req, res) => {
  try {
    // Get email and password from request body
    const { email, password } = req.body

    // Check if email or password is missing
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill up all the required fields",
      })
    }

    // Find user with provided email
    const user = await User.findOne({ email }).populate("additionalDetails")

    // If user not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User is not registered with us. Please sign up to continue.",
      })
    }

    // Generate JWT token and Compare Password
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        {
          email: user.email,
          id: user._id,
          role: user.accountType,
          accountType: user.accountType,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      )

      // Save token to user document in database
      user.token = token
      user.password = undefined

      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      }

      return res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "User login success",
      })
    } else {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      })
    }
  } catch (error) {
    console.error("Login error:", error)
    return res.status(500).json({
      success: false,
      message: "Login failure. Please try again.",
      error: error.message,
    })
  }
}

// Send OTP For Email Verification
exports.sendotp = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required to send OTP",
      })
    }

    // Check if user is already registered
    const checkUserPresent = await User.findOne({ email })
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "User is already registered",
      })
    }

    let otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    })

    // Ensure OTP uniqueness
    let existingOtp = await OTP.findOne({ otp: otp })
    while (existingOtp) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
      })
      existingOtp = await OTP.findOne({ otp: otp })
    }

    const otpPayload = { email, otp }
    const otpBody = await OTP.create(otpPayload)
    console.log("OTP Body:", otpBody)

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp,
    })
  } catch (error) {
    console.error("Send OTP error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    })
  }
}

// Controller for Changing Password
exports.changePassword = async (req, res) => {
  try {
    const userDetails = await User.findById(req.user.id)
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
      })
    }

    // Validate old password
    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      userDetails.password
    )
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "The current password is incorrect",
      })
    }

    // Update password
    const encryptedPassword = await bcrypt.hash(newPassword, 10)
    const updatedUserDetails = await User.findByIdAndUpdate(
      req.user.id,
      { password: encryptedPassword },
      { new: true }
    )

    // Send notification email
    try {
      await mailSender(
        updatedUserDetails.email,
        "Password for your account has been updated",
        passwordUpdated(
          updatedUserDetails.email,
          `Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
        )
      )
    } catch (emailError) {
      console.error("Error occurred while sending password update email:", emailError)
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    })
  } catch (error) {
    console.error("Error updating password:", error)
    return res.status(500).json({
      success: false,
      message: "Error occurred while updating password",
      error: error.message,
    })
  }
}
