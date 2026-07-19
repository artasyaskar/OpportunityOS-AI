import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
// Assuming you have firebaseAdmin configured or you just want email
// If no firebaseAdmin, we just send email.

export async function POST(req: Request) {
  try {
    const { userId, userEmail, userName, planId, provider, referenceId, receiptUrl } = await req.json();

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.log('SMTP not configured, skipping email notification.');
      return NextResponse.json({ success: true, warning: 'SMTP not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail', // or configured host
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL,
      subject: `🚨 New Payment Receipt Submitted - ${userName}`,
      html: `
        <h2>New Payment Verification Request</h2>
        <p><strong>User:</strong> ${userName} (${userEmail})</p>
        <p><strong>Plan:</strong> ${planId}</p>
        <p><strong>Provider:</strong> ${provider}</p>
        <p><strong>Reference ID:</strong> ${referenceId}</p>
        <br/>
        <p><strong>Receipt Proof:</strong> <a href="${receiptUrl}">View Receipt Image</a></p>
        <br/>
        <p>Log in to the <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/admin">Admin Dashboard</a> to approve or reject this request.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending receipt notification email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
