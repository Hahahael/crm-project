import express from "express";
import nodemailer from "nodemailer";
import { poolPromise } from "../mssql.js";

const router = express.Router();

// Create transporter using MSSQL EmailCreds configuration
const createTransporter = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT TOP 1 * FROM spidb.EmailCreds WHERE Id = 1");
    
    if (!result.recordset || result.recordset.length === 0) {
      throw new Error("Email credentials not found in database");
    }
    
    const emailConfig = result.recordset[0];
    console.log("📧 Loading email config from database:", {
      host: emailConfig.Host,
      port: emailConfig.SmtpPort,
      from: emailConfig.MailFrom,
      fromName: emailConfig.MailFromName
    });
    
    return nodemailer.createTransport({
      host: emailConfig.Host,
      port: parseInt(emailConfig.SmtpPort),
      secure: parseInt(emailConfig.SmtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: emailConfig.NetworkCredsUserName,
        pass: emailConfig.NetworkCredsPass
      }
    });
  } catch (error) {
    console.error("❌ Failed to create email transporter from database config:", error);
    throw error;
  }
};

// Get email configuration from database
const getEmailConfig = async () => {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .query("SELECT TOP 1 * FROM spidb.EmailCreds WHERE Id = 1");
    
    if (!result.recordset || result.recordset.length === 0) {
      throw new Error("Email credentials not found in database");
    }
    
    return result.recordset[0];
  } catch (error) {
    console.error("❌ Failed to get email config:", error);
    throw error;
  }
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

    // Create transporter with database config
    const transporter = await createTransporter();
    const emailConfig = await getEmailConfig();

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

    // Prepare email options with database config
    const mailOptions = {
      from: `"${emailConfig.MailFromName}" <${emailConfig.MailFrom}>`,
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

// Get email configuration (without sensitive data)
router.get("/config", async (req, res) => {
  try {
    const emailConfig = await getEmailConfig();
    
    res.json({
      success: true,
      config: {
        host: emailConfig.Host,
        port: emailConfig.SmtpPort,
        from: emailConfig.MailFrom,
        fromName: emailConfig.MailFromName,
        // Don't expose credentials
        hasCredentials: !!(emailConfig.NetworkCredsUserName && emailConfig.NetworkCredsPass)
      }
    });
  } catch (error) {
    console.error("Failed to get email config:", error);
    res.status(500).json({
      error: "Failed to get email configuration",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test email configuration
router.post("/test", async (req, res) => {
  try {
    const transporter = await createTransporter();
    const emailConfig = await getEmailConfig();
    await transporter.verify();
    
    res.json({
      success: true,
      message: "Email configuration is working",
      config: {
        host: emailConfig.Host,
        port: emailConfig.SmtpPort,
        from: emailConfig.MailFrom,
        fromName: emailConfig.MailFromName
      }
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