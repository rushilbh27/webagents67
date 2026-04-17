import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    } : undefined
});

router.post('/request-access', async (req, res) => {
    const { name, company, email, number, role, purpose } = req.body;

    // Validate required fields
    if (!name || !company || !email || !number || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const adminEmail = process.env.ADMIN_EMAIL;

        // Email to admin
        const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@webagents.app',
            to: adminEmail,
            subject: `API Access Request - ${company}`,
            html: `
                <h2>New API Access Request</h2>
                <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Company</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${company}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                        <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
                        <td style="padding: 10px; border: 1px solid #ddd;"><a href="tel:${number}">${number}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Role</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${role}</td>
                    </tr>
                    ${purpose ? `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Purpose</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${purpose}</td>
                    </tr>
                    ` : ''}
                </table>
                <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
                    Received at: ${new Date().toISOString()}
                </p>
            `
        };

        // Send email
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log('[EMAIL WOULD BE SENT]', mailOptions);
        }

        res.json({ 
            message: 'Request submitted successfully! We will review it and get back to you soon.' 
        });

    } catch (err) {
        console.error('Error sending email:', err);
        res.status(500).json({ error: 'Failed to submit request. Please try again.' });
    }
});

export default router;
