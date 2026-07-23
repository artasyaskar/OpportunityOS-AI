import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { validateRequest } from '@/lib/auth/serverAuth';
import { checkRateLimit } from '@/lib/rateLimiter';

/**
 * Emails the admin when a user submits a payment receipt.
 *
 * This is a USER-triggered action (not admin-only), so it requires a valid
 * Firebase ID token and rate-limits per uid. Identity fields (userId/userEmail)
 * are taken from the verified token — never from the request body — so a caller
 * can't spoof another user or spam the admin inbox with forged senders.
 */
export async function POST(req: NextRequest) {
  const authResult = await validateRequest(req);
  if (authResult instanceof NextResponse) return authResult;
  const { uid } = authResult;

  const rateLimit = await checkRateLimit(req, uid);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: rateLimit.headers });
  }

  try {
    const body = await req.json().catch(() => ({}));
    // Identity comes from the verified token; only descriptive fields come from the body.
    const userId = uid;
    const userEmail = typeof body.userEmail === 'string' ? body.userEmail.slice(0, 200) : '';
    const userName = typeof body.userName === 'string' ? body.userName.slice(0, 200) : '';
    const planId = typeof body.planId === 'string' ? body.planId.slice(0, 100) : '';
    const provider = typeof body.provider === 'string' ? body.provider.slice(0, 100) : '';
    const referenceId = typeof body.referenceId === 'string' ? body.referenceId.slice(0, 200) : '';
    const receiptUrl = typeof body.receiptUrl === 'string' ? body.receiptUrl.slice(0, 2000) : '';

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

    // Escape all user-controlled values before interpolating into HTML email.
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    // Only render the receipt link if it's a safe http(s) or data-image URL.
    const safeReceipt = /^(https?:\/\/|data:image\/)/i.test(receiptUrl) ? receiptUrl : '';

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_EMAIL,
      subject: `New Payment Receipt Submitted - ${esc(userName) || esc(userId)}`,
      html: `
        <h2>New Payment Verification Request</h2>
        <p><strong>User:</strong> ${esc(userName)} (${esc(userEmail)})</p>
        <p><strong>User ID:</strong> ${esc(userId)}</p>
        <p><strong>Plan:</strong> ${esc(planId)}</p>
        <p><strong>Provider:</strong> ${esc(provider)}</p>
        <p><strong>Reference ID:</strong> ${esc(referenceId)}</p>
        <br/>
        <p><strong>Receipt Proof:</strong> ${safeReceipt ? `<a href="${esc(safeReceipt)}">View Receipt Image</a>` : 'No valid receipt URL provided'}</p>
        <br/>
        <p>Log in to the <a href="${esc(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}/dashboard/admin">Admin Dashboard</a> to approve or reject this request.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending receipt notification email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
