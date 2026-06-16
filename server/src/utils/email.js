const nodemailer = require('nodemailer');

const smtpConfigured = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Force IPv4 — Gmail resolves to IPv6 on some networks which may be unreachable
      family: 4,
    })
  : null;

async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  if (!smtpConfigured) {
    console.log('--------------------------------------------------');
    console.log(`[email] Verification link for ${email}:`);
    console.log(verifyUrl);
    console.log('--------------------------------------------------');
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'MMCMS — Verify your email',
    html: `<h2>Welcome to MMCMS</h2>
           <p>Click the link below to verify your email:</p>
           <a href="${verifyUrl}">${verifyUrl}</a>
           <p>This link expires in 24 hours.</p>`,
  });
}

async function sendAccountApprovedEmail(email, username) {
  const loginUrl = `${process.env.CLIENT_URL}/login`;

  if (!smtpConfigured) {
    console.log('--------------------------------------------------');
    console.log(`[email] Account approval notice for ${email}:`);
    console.log(`Your account (${username}) has been approved. You can now log in at ${loginUrl}`);
    console.log('--------------------------------------------------');
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'MMCMS — Your account has been approved',
    html: `<h2>Account approved</h2>
           <p>Hi ${username},</p>
           <p>Your MMCMS account has been approved by an administrator. You can now log in:</p>
           <a href="${loginUrl}">${loginUrl}</a>`,
  });
}

async function sendTestResultEmail({ to, patientName, testName, resultValue, normalRange, resultDate, remarks }) {
  const portalUrl = `${process.env.CLIENT_URL}/login`;
  const dateStr = resultDate ? new Date(resultDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  if (!smtpConfigured) {
    console.log('--------------------------------------------------');
    console.log(`[email] Test result for ${to}: ${testName} → ${resultValue}`);
    console.log('--------------------------------------------------');
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `MMCMS — Your test result is ready: ${testName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:linear-gradient(135deg,#0284c7,#0d9488);padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;color:#fff;font-size:20px">Mortuza Medical Centre</h1>
          <p style="margin:4px 0 0;color:#bae6fd;font-size:13px">Laboratory Report</p>
        </div>
        <div style="background:#f8fafc;padding:28px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p style="margin:0 0 16px">Dear <strong>${patientName}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569">Your diagnostic test result has been finalized by the laboratory. Details are below.</p>

          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
            <tr style="background:#e0f2fe">
              <td style="padding:10px 14px;font-weight:600;color:#0369a1;border-radius:6px 0 0 0;width:36%">Test</td>
              <td style="padding:10px 14px;border-radius:0 6px 0 0"><strong>${testName}</strong></td>
            </tr>
            <tr style="background:#fff">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border-top:1px solid #e2e8f0">Result</td>
              <td style="padding:10px 14px;border-top:1px solid #e2e8f0;color:#0f766e;font-weight:700;font-size:15px">${resultValue}</td>
            </tr>
            ${normalRange ? `
            <tr style="background:#f8fafc">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border-top:1px solid #e2e8f0">Normal range</td>
              <td style="padding:10px 14px;border-top:1px solid #e2e8f0;color:#64748b">${normalRange}</td>
            </tr>` : ''}
            <tr style="background:#fff">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border-top:1px solid #e2e8f0">Result date</td>
              <td style="padding:10px 14px;border-top:1px solid #e2e8f0;color:#475569">${dateStr}</td>
            </tr>
            ${remarks ? `
            <tr style="background:#f8fafc">
              <td style="padding:10px 14px;font-weight:600;color:#374151;border-top:1px solid #e2e8f0">Remarks</td>
              <td style="padding:10px 14px;border-top:1px solid #e2e8f0;color:#475569">${remarks}</td>
            </tr>` : ''}
          </table>

          <a href="${portalUrl}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:600">View in patient portal →</a>

          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
            This is an automated message from Mortuza Medical Centre Management System. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendAccountApprovedEmail, sendTestResultEmail };
