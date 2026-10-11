const { contactUsEmail } = require("../mail/templates/contactFormRes")
const mailSender = require("../utils/mailSender")

exports.contactUsController = async (req, res) => {
  const { email, firstname, lastname, message, phoneNo, countrycode } = req.body

  if (!email || !message) {
    return res.status(400).json({
      success: false,
      message: "Email and message are required",
    })
  }

  try {
    await mailSender(
      email,
      "Your message has been sent successfully",
      contactUsEmail(email, firstname, lastname, message, phoneNo, countrycode)
    )

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    })
  } catch (error) {
    console.error("Contact us error:", error)
    return res.status(500).json({
      success: false,
      message: "Something went wrong while sending message",
      error: error.message,
    })
  }
}

