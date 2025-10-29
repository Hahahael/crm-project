import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

// Create transporter (you'll need to configure this with your email provider)
const createTransporter = () => {
  // For development, you can use a service like Gmail, Outlook, or a dedicated SMTP service
  // For production, consider using SendGrid, AWS SES, or similar services
  
  return nodemailer.createTransporter({
    // Gmail configuration (you'll need to enable "less secure apps" or use app passwords)
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
    
    // Alternative SMTP configuration
    // host: process.env.SMTP_HOST || 'smtp.example.com',
    // port: process.env.SMTP_PORT || 587,
    // secure: false, // true for 465, false for other ports
    // auth: {
    //   user: process.env.SMTP_USER,
    //   pass: process.env.SMTP_PASS
    // }
  });
};

// Send RFQ email
router.post("/send-rfq", async (req, res) => {
  try {
    const { to, subject, content, vendor, rfqData, rfqItems } = req.body;

    console.log("📧 Sending RFQ email:", {
      to,
      subject,
      vendor: vendor?.name,
      itemCount: rfqItems?.length || 0
    });

    // Validate required fields
    if (!to || !subject || !content) {
      return res.status(400).json({ 
        error: "Missing required fields: to, subject, content" 
      });
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log("✅ Email transporter is ready");
    } catch (verifyError) {
      console.error("❌ Email transporter verification failed:", verifyError);
      return res.status(500).json({ 
        error: "Email service not configured properly" 
      });
    }

    // Prepare email options
    const mailOptions = {
      from: `"Procurement Team" <${process.env.EMAIL_USER || 'your-email@gmail.com'}>`,
      to: to,
      subject: subject,
      html: content,
      // Add text version for better email compatibility
      text: content.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text version
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ Email sent successfully:", {
      messageId: info.messageId,
      to: to,
      subject: subject
    });

    // Log email activity (you might want to save this to database)
    const emailLog = {
      to,
      subject,
      vendor_id: vendor?.id || vendor?.vendorId,
      rfq_id: rfqData?.id || rfqData?.rfqId,
      sent_at: new Date(),
      message_id: info.messageId,
      status: 'sent'
    };
    
    console.log("📝 Email log:", emailLog);

    res.json({
      success: true,
      messageId: info.messageId,
      message: "RFQ email sent successfully"
    });

  } catch (error) {
    console.error("❌ Failed to send RFQ email:", error);
    
    res.status(500).json({
      error: "Failed to send email",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test email configuration
router.post("/test", async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    res.json({
      success: true,
      message: "Email configuration is working"
    });
  } catch (error) {
    console.error("Email configuration test failed:", error);
    res.status(500).json({
      error: "Email configuration failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;