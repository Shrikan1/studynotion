const Category = require("../models/Category")

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" })
    }
    const categoryDetails = await Category.create({
      name: name,
      description: description,
    })
    console.log("Category created:", categoryDetails)
    return res.status(200).json({
      success: true,
      message: "Category Created Successfully",
      data: categoryDetails,
    })
  } catch (error) {
    console.error("Create category error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating category",
      error: error.message,
    })
  }
}

exports.showAllCategories = async (req, res) => {
  try {
    const allCategories = await Category.find()
    return res.status(200).json({
      success: true,
      data: allCategories,
    })
  } catch (error) {
    console.error("Show all categories error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    })
  }
}

exports.categoryPageDetails = async (req, res) => {
  try {
    const { categoryId } = req.body

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId is required",
      })
    }

    // Get courses for the specified category
    const selectedCategory = await Category.findById(categoryId)
      .populate({
        path: "courses",
        match: { status: "Published" },
        populate: [
          { path: "ratingAndReviews" },
          { path: "instructor" },
        ],
      })
      .exec()

    // Handle the case when the category is not found
    if (!selectedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" })
    }

    // Get courses for other categories safely
    const categoriesExceptSelected = await Category.find({
      _id: { $ne: categoryId },
    })

    let differentCategory = null
    if (categoriesExceptSelected.length > 0) {
      const randomIndex = getRandomInt(categoriesExceptSelected.length)
      const randomCategory = categoriesExceptSelected[randomIndex]
      if (randomCategory && randomCategory._id) {
        differentCategory = await Category.findById(randomCategory._id)
          .populate({
            path: "courses",
            match: { status: "Published" },
            populate: [
              { path: "ratingAndReviews" },
              { path: "instructor" },
            ],
          })
          .exec()
      }
    }

    // Get top-selling courses across all categories
    const allCategories = await Category.find()
      .populate({
        path: "courses",
        match: { status: "Published" },
        populate: [
          { path: "ratingAndReviews" },
          { path: "instructor" },
        ],
      })
      .exec()

    const allCourses = allCategories.flatMap((category) => category.courses || [])
    const mostSellingCourses = allCourses
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 10)

    return res.status(200).json({
      success: true,
      data: {
        selectedCategory,
        differentCategory,
        mostSellingCourses,
      },
    })
  } catch (error) {
    console.error("Category page details error:", error)
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching category page details",
      error: error.message,
    })
  }
}
