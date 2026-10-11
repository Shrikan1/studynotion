// Import necessary modules
const Section = require("../models/Section")
const SubSection = require("../models/Subsection")
const { uploadImageToCloudinary } = require("../utils/imageUploader")

// Create a new sub-section for a given section
exports.createSubSection = async (req, res) => {
  try {
    // Extract necessary information from the request body
    const { sectionId, title, description } = req.body
    const video = req.files ? req.files.video : null

    // Check if all necessary fields are provided
    if (!sectionId || !title || !description || !video) {
      return res.status(400).json({
        success: false,
        message: "All fields (sectionId, title, description, video) are required",
      })
    }

    // Verify that the section exists
    const section = await Section.findById(sectionId)
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      })
    }

    // Upload the video file to Cloudinary
    const uploadDetails = await uploadImageToCloudinary(
      video,
      process.env.FOLDER_NAME
    )

    // Create a new sub-section with the necessary information
    const subSectionDetails = await SubSection.create({
      title: title,
      timeDuration: `${uploadDetails.duration || 0}`,
      description: description,
      videoUrl: uploadDetails.secure_url,
    })

    // Update the corresponding section with the newly created sub-section
    const updatedSection = await Section.findByIdAndUpdate(
      { _id: sectionId },
      { $push: { subSection: subSectionDetails._id } },
      { new: true }
    ).populate("subSection")

    // Return the updated section in the response
    return res.status(200).json({
      success: true,
      message: "Lecture created successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error("Error creating new sub-section:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating lecture",
      error: error.message,
    })
  }
}

// UPDATE a sub-section
exports.updateSubSection = async (req, res) => {
  try {
    const { sectionId, subSectionId, title, description } = req.body

    if (!subSectionId) {
      return res.status(400).json({
        success: false,
        message: "subSectionId is required",
      })
    }

    const subSection = await SubSection.findById(subSectionId)

    if (!subSection) {
      return res.status(404).json({
        success: false,
        message: "SubSection not found",
      })
    }

    if (title !== undefined) {
      subSection.title = title
    }

    if (description !== undefined) {
      subSection.description = description
    }

    if (req.files && req.files.video !== undefined) {
      const video = req.files.video
      const uploadDetails = await uploadImageToCloudinary(
        video,
        process.env.FOLDER_NAME
      )
      subSection.videoUrl = uploadDetails.secure_url
      subSection.timeDuration = `${uploadDetails.duration || 0}`
    }

    await subSection.save()

    // Find the section to return
    let targetSectionId = sectionId
    if (!targetSectionId) {
      const parentSection = await Section.findOne({ subSection: subSectionId })
      if (parentSection) {
        targetSectionId = parentSection._id
      }
    }

    const updatedSection = targetSectionId
      ? await Section.findById(targetSectionId).populate("subSection")
      : null

    return res.status(200).json({
      success: true,
      message: "Lecture updated successfully",
      data: updatedSection || subSection,
    })
  } catch (error) {
    console.error("Error updating sub-section:", error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the lecture",
      error: error.message,
    })
  }
}

// DELETE a sub-section
exports.deleteSubSection = async (req, res) => {
  try {
    const { subSectionId, sectionId } = req.body

    if (!subSectionId) {
      return res.status(400).json({
        success: false,
        message: "subSectionId is required",
      })
    }

    let targetSectionId = sectionId
    if (!targetSectionId) {
      const parentSection = await Section.findOne({ subSection: subSectionId })
      if (parentSection) {
        targetSectionId = parentSection._id
      }
    }

    if (targetSectionId) {
      await Section.findByIdAndUpdate(
        { _id: targetSectionId },
        {
          $pull: {
            subSection: subSectionId,
          },
        }
      )
    }

    const subSection = await SubSection.findByIdAndDelete({ _id: subSectionId })

    if (!subSection) {
      return res
        .status(404)
        .json({ success: false, message: "SubSection not found" })
    }

    // Find updated section and return it
    const updatedSection = targetSectionId
      ? await Section.findById(targetSectionId).populate("subSection")
      : null

    return res.status(200).json({
      success: true,
      message: "SubSection deleted successfully",
      data: updatedSection,
    })
  } catch (error) {
    console.error("Error deleting sub-section:", error)
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the SubSection",
      error: error.message,
    })
  }
}
