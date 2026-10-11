const Section = require("../models/Section")
const Course = require("../models/Course")
const SubSection = require("../models/Subsection")

// CREATE a new section
exports.createSection = async (req, res) => {
  try {
    // Extract the required properties from the request body
    const { sectionName, courseId } = req.body

    // Validate the input
    if (!sectionName || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Missing required properties: sectionName and courseId are required",
      })
    }

    // Check if the course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      })
    }

    // Create a new section with the given name
    const newSection = await Section.create({ sectionName })

    // Add the new section to the course's content array
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      {
        $push: {
          courseContent: newSection._id,
        },
      },
      { new: true }
    )
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    // Return the updated course object in the response
    return res.status(200).json({
      success: true,
      message: "Section created successfully",
      data: updatedCourse,
      updatedCourse,
    })
  } catch (error) {
    console.error("Error creating section:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating section",
      error: error.message,
    })
  }
}

// UPDATE a section
exports.updateSection = async (req, res) => {
  try {
    const { sectionName, sectionId, courseId } = req.body

    // Validate input
    if (!sectionName || !sectionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required properties: sectionName and sectionId are required",
      })
    }

    // Update section name
    const section = await Section.findByIdAndUpdate(
      sectionId,
      { sectionName },
      { new: true }
    )

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      })
    }

    // Find the associated course to return full course structure
    let course = null
    if (courseId) {
      course = await Course.findById(courseId)
        .populate({
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        })
        .exec()
    } else {
      course = await Course.findOne({ courseContent: sectionId })
        .populate({
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        })
        .exec()
    }

    return res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: course || section,
      updatedCourse: course,
    })
  } catch (error) {
    console.error("Error updating section:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating section",
      error: error.message,
    })
  }
}

// DELETE a section
exports.deleteSection = async (req, res) => {
  try {
    const { sectionId, courseId } = req.body

    if (!sectionId) {
      return res.status(400).json({
        success: false,
        message: "Missing sectionId",
      })
    }

    // Determine target course
    let targetCourseId = courseId
    if (!targetCourseId) {
      const parentCourse = await Course.findOne({ courseContent: sectionId })
      if (parentCourse) {
        targetCourseId = parentCourse._id
      }
    }

    // Check if section exists
    const section = await Section.findById(sectionId)
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      })
    }

    // Delete associated subsections
    if (section.subSection && section.subSection.length > 0) {
      await SubSection.deleteMany({ _id: { $in: section.subSection } })
    }

    // Delete the section
    await Section.findByIdAndDelete(sectionId)

    // Pull section from Course
    let course = null
    if (targetCourseId) {
      course = await Course.findByIdAndUpdate(
        targetCourseId,
        {
          $pull: {
            courseContent: sectionId,
          },
        },
        { new: true }
      )
        .populate({
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        })
        .exec()
    }

    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
      data: course,
      updatedCourse: course,
    })
  } catch (error) {
    console.error("Error deleting section:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting section",
      error: error.message,
    })
  }
}
