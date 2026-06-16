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

module.exports = { sendVerificationEmail, sendAccountApprovedEmail };
