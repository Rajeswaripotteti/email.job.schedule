
import { Worker } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
import pool from "./db";

const redisConnection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const worker = new Worker(
  "email-jobs",
  async (job) => {
    console.log("Processing job:", job.id);
    
const result = await pool.query(
  `SELECT recipient, subject, message, status
   FROM email_jobs
   WHERE id = $1`,
  [job.data.emailId]
);

if (result.rows.length === 0) {
  throw new Error(`Email ID ${job.data.emailId} not found`);
}

const email = result.rows[0];

if (email.status === "sent") {
  console.log(`Email ${job.data.emailId} already sent. Skipping.`);
  return { emailId: job.data.emailId, skipped: true };
}


    const info = await transporter.sendMail({
      from: `"Email Job Scheduler" <${process.env.SMTP_USER}>`,
      to: email.recipient,
      subject: email.subject,
      text: email.message,
    });
    await pool.query(
  `UPDATE email_jobs
   SET status = 'sent'
   WHERE id = $1`,
  [job.data.emailId]
);

    console.log("Email sent to Ethereal:", email.recipient);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info));

    return { emailId: job.data.emailId };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", async (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);

  if (!job) return;

  const maxAttempts = job.opts.attempts ?? 1;

  if (job.attemptsMade >= maxAttempts) {
    try {
      await pool.query(
        `UPDATE email_jobs
         SET status = 'failed'
         WHERE id = $1 AND status <> 'sent'`,
        [job.data.emailId]
      );

      console.log(`Email ${job.data.emailId} marked as failed`);
    } catch (dbError) {
      console.error("Failed to update email status:", dbError);
    }
  }
});


console.log("Email worker is running!");
