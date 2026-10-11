const Profile = require("../models/Profile")
const CourseProgress = require("../models/CourseProgress")
const Course = require("../models/Course")
const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const mongoose = require("mongoose")
const { convertSecondsToDuration } = require("../utils/secToDuration")

// Method for updating a profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName = "",
      lastName = "",
      dateOfBirth = "",
      about = "",
      contactNumber = "",
      gender = "",
    } = req.body
    const id = req.user.id

    // Find the user by id
    const userDetails = await User.findById(id)
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Update user details
    if (firstName) userDetails.firstName = firstName
    if (lastName) userDetails.lastName = lastName
    if (contactNumber) userDetails.contactNumber = contactNumber
    await userDetails.save()

    // Find or create the profile
    let profile = await Profile.findById(userDetails.additionalDetails)
    if (!profile) {
      profile = await Profile.create({
        gender,
        dateOfBirth,
        about,
        contactNumber,
      })
      userDetails.additionalDetails = profile._id
      await userDetails.save()
    } else {
      profile.dateOfBirth = dateOfBirth || profile.dateOfBirth
      profile.about = about || profile.about
      profile.contactNumber = contactNumber || profile.contactNumber
      profile.gender = gender || profile.gender
      await profile.save()
    }

    // Find the updated user details
    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
      data: updatedUserDetails,
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating profile",
      error: error.message,
    })
  }
}

exports.deleteAccount = async (req, res) => {
  try {
    const id = req.user.id
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Delete Associated Profile with the User
    if (user.additionalDetails) {
      await Profile.findByIdAndDelete(user.additionalDetails)
    }

    // Unenroll from courses
    if (user.courses && user.courses.length > 0) {
      for (const courseId of user.courses) {
        await Course.findByIdAndUpdate(courseId, {
          $pull: { studentsEnroled: id },
        })
      }
    }

    // Delete CourseProgress documents
    await CourseProgress.deleteMany({ userId: id })

    // Delete User
    await User.findByIdAndDelete(id)

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting user account:", error)
    return res.status(500).json({
      success: false,
      message: "User cannot be deleted",
      error: error.message,
    })
  }
}

exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id
    const userDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()

    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    return res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    })
  } catch (error) {
    console.error("Error getting user details:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: error.message,
    })
  }
}

exports.updateDisplayPicture = async (req, res) => {
  try {
    if (!req.files || !req.files.displayPicture) {
      return res.status(400).json({
        success: false,
        message: "Display picture file is required",
      })
    }

    const displayPicture = req.files.displayPicture
    const userId = req.user.id
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    )

    const updatedProfile = await User.findByIdAndUpdate(
      userId,
      { image: image.secure_url },
      { new: true }
    ).populate("additionalDetails")

    return res.status(200).json({
      success: true,
      message: "Image Updated successfully",
      data: updatedProfile,
    })
  } catch (error) {
    console.error("Error updating display picture:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to update display picture",
      error: error.message,
    })
  }
}

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id
    let userDoc = await User.findOne({ _id: userId })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec()

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: `Could not find user with id: ${userId}`,
      })
    }

    let userDetails = userDoc.toObject()
    for (let i = 0; i < (userDetails.courses || []).length; i++) {
      let totalDurationInSeconds = 0
      let SubsectionLength = 0
      const course = userDetails.courses[i]
      for (let j = 0; j < (course.courseContent || []).length; j++) {
        const section = course.courseContent[j]
        totalDurationInSeconds += (section.subSection || []).reduce(
          (acc, curr) => acc + (parseInt(curr.timeDuration) || 0),
          0
        )
        SubsectionLength += (section.subSection || []).length
      }
      userDetails.courses[i].totalDuration = convertSecondsToDuration(
        totalDurationInSeconds
      )

      let courseProgressCount = await CourseProgress.findOne({
        courseID: userDetails.courses[i]._id,
        userId: userId,
      })
      const completedCount =
        courseProgressCount?.completedVideos?.length || 0

      if (SubsectionLength === 0) {
        userDetails.courses[i].progressPercentage = 100
      } else {
        const multiplier = Math.pow(10, 2)
        userDetails.courses[i].progressPercentage =
          Math.round(
            (completedCount / SubsectionLength) * 100 * multiplier
          ) / multiplier
      }
    }

    return res.status(200).json({
      success: true,
      data: userDetails.courses,
    })
  } catch (error) {
    console.error("Error fetching enrolled courses:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled courses",
      error: error.message,
    })
  }
}

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id })

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = (course.studentsEnroled || []).length
      const totalAmountGenerated = totalStudentsEnrolled * (course.price || 0)

      return {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated,
      }
    })

    return res.status(200).json({
      success: true,
      courses: courseData,
      data: courseData,
    })
  } catch (error) {
    console.error("Instructor dashboard error:", error)
    return res.status(500).json({
      success: false,
      message: "Server Error while fetching instructor stats",
      error: error.message,
    })
  }
}

