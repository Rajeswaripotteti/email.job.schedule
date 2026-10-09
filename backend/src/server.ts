import express =require("express");
import cors from "cors";
import pool from "./db";
import { emailQueue } from "./emailQueue";
import multer =require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedExtensions = [".csv", ".txt"];
    const extension = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (allowedExtensions.includes(extension)) {
      callback(null, true);
    } else {
      callback(new Error("Only CSV and TXT files are allowed"));
    }
  },
});

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({
    message: "Email Job Scheduler Backend is running!",
  });
});


app.post("/api/emails/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please upload a CSV or TXT file.",
    });
  }

  try {
    const content = req.file.buffer.toString("utf-8").trim();

    if (!content) {
      return res.status(400).json({ message: "File is empty." });
    }

    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    const parseRow = (line: string) => {
      const values: string[] = [];
      let value = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"' && line[i + 1] === '"' && inQuotes) {
          value += '"';
          i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(value.trim());
          value = "";
        } else {
          value += char;
        }
      }

      values.push(value.trim());
      return values;
    };
const headerLine = lines[0];

if (!headerLine) {
  return res.status(400).json({
    message: "CSV file is empty.",
  });
}

const header = parseRow(headerLine).map((item) => item.toLowerCase());
const required = ["recipient", "subject", "message", "scheduled_at"];
   

    if (!required.every((column) => header.includes(column))) {
      return res.status(400).json({
        message: "Required columns: recipient, subject, message, scheduled_at",
      });
    }

    const indexes = required.map((column) => header.indexOf(column));
    const rows = lines.slice(1).map(parseRow);
    const scheduledEmails = [];

    for (let i = 0; i < rows.length; i++) {
      const [recipient, subject, message, scheduledAt] =
  indexes.map((index) => rows[i]?.[index] ?? "");

const date = new Date(scheduledAt ?? "");
      if (
        !recipient ||
        !subject ||
        !message ||
        !scheduledAt ||
        isNaN(date.getTime()) ||
        date <= new Date()
      ) {
        return res.status(400).json({
          message: `Invalid data or non-future scheduled_at on file row ${i + 2}. No emails were scheduled.`,
        });
      }

      scheduledEmails.push({ recipient, subject, message, date });
    }

    if (scheduledEmails.length === 0) {
      return res.status(400).json({
        message: "The file contains no email rows.",
      });
    }

    const client = await pool.connect();
    const createdEmails = [];

    try {
      await client.query("BEGIN");

      for (const email of scheduledEmails) {
        const result = await client.query(
          `INSERT INTO email_jobs (recipient, subject, message, scheduled_at)
           VALUES ($1, $2, $3, $4)
           RETURNING id, recipient, subject, message, scheduled_at, status`,
          [email.recipient, email.subject, email.message, email.date]
        );

        createdEmails.push(result.rows[0]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    for (const email of createdEmails) {
      await emailQueue.add(
        "send-email",
        { emailId: email.id },
        {
          delay: Math.max(
            0,
            new Date(email.scheduled_at).getTime() - Date.now()
          ),
          jobId: `email-${email.id}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: false,
        }
      );
    }

    return res.status(201).json({
      message: `${createdEmails.length} emails scheduled successfully.`,
      emails: createdEmails,
    });
  } catch (error) {
    console.error("Upload scheduling error:", error);
    return res.status(500).json({
      message: "Failed to process uploaded file.",
    });
  }
});



app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully!",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.post("/api/emails", async (req, res) => {
  try {
    const { recipient, subject, message, scheduled_at } = req.body;

    if (!recipient || !subject || !message || !scheduled_at) {
      return res.status(400).json({
        message: "Please fill in all email fields.",
      });
    }

    const scheduledDate = new Date(scheduled_at);

    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return res.status(400).json({
        message: "Please select a valid future date and time.",
      });
    }

    const result = await pool.query(
      `INSERT INTO email_jobs (recipient, subject, message, scheduled_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [recipient, subject, message, scheduledDate]
    );

    const email = result.rows[0];

    await emailQueue.add(
      "send-email",
      { emailId: email.id },
      {
        delay: Math.max(0, scheduledDate.getTime() - Date.now()),
        jobId: `email-${email.id}`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: false,
      }
    );

    return res.status(201).json({
      message: "Email scheduled successfully!",
      email,
    });
  } catch (error) {
    console.error("Email scheduling error:", error);
    return res.status(500).json({
      message: "Failed to schedule email.",
    });
  }
});

app.get("/api/emails", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, recipient, subject, message, scheduled_at,status
       FROM email_jobs
       ORDER BY scheduled_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch emails error:", error);
    res.status(500).json({
      message: "Failed to fetch emails.",
    });
  }
});



const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});