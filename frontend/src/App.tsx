import { useEffect, useState } from 'react'
import './App.css'


type Email = {
  id: number;
  recipient: string;
  subject: string;
  message: string;
  scheduled_at: string;
  status: string;
};


function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [compose, setCompose] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailDetail, setEmailDetail] = useState(false)
   const [emails, setEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [recipient, setRecipient] = useState("");
const [subject, setSubject] = useState("");
const [message, setMessage] = useState("");
const [saving, setSaving] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const [scheduledAt, setScheduledAt] = useState(() => {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
});
const [emailFilter, setEmailFilter] = useState("all");
const [searchTerm, setSearchTerm] = useState("");

useEffect(() => {
  const fetchEmails = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/emails");

      if (!response.ok) {
        throw new Error("Failed to load emails");
      }

      const data: Email[] = await response.json();
      setEmails(data);
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoadingEmails(false);
    }
  };

  fetchEmails();

  const intervalId = setInterval(fetchEmails, 5000);

  return () => clearInterval(intervalId);
}, []);

 

const normalize = (value: string) =>
  value.toLowerCase().replace(/\s+/g, "").trim();

const filteredEmails = emails.filter((email) => {
  const query = normalize(searchTerm);

  const matchesSearch =
    query === "" ||
    normalize(email.subject).includes(query) ||
    normalize(email.recipient).includes(query) ||
    normalize(email.message).includes(query);

  const matchesStatus =
    emailFilter === "all" || email.status === emailFilter;

  return matchesSearch && matchesStatus;
});






  // LOGIN PAGE
  if (!loggedIn) {
    return (
      <div className="login-page">
        <div className="login-container">

          <h1>ONB</h1>
          <p className="subtitle">Email Job Scheduler</p>

          <div className="login-box">
            <h2>Login</h2>

            <button className="google-btn">
              <span className="google-icon">G</span>
              Login with Google
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
            />

            <button
              className="login-btn"
              onClick={() => setLoggedIn(true)}
            >
              Login
            </button>

            <p className="signup-text">
              Don't have an account? <span>Sign up</span>
            </p>
          </div>

        </div>
      </div>
    )
  }

  // COMPOSE PAGE
  // COMPOSE PAGE
  if (compose) {
    const handleScheduleEmail = async () => {
      setError("");
      setSuccess("");

      if (!recipient.trim() || !subject.trim() || !message.trim() || !scheduledAt) {
        setError("Please fill in all fields.");
        return;
      }

      if (new Date(scheduledAt).getTime() <= Date.now()) {
        setError("Please choose a future date and time.");
        return;
      }

      try {
        setSaving(true);

        const response = await fetch("http://localhost:5000/api/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: recipient.trim(),
            subject: subject.trim(),
            message: message.trim(),
            scheduled_at: scheduledAt,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to schedule email.");
        }

        setSuccess("Email scheduled successfully!");
        setRecipient("");
        setSubject("");
        setMessage("");

        alert("Email scheduled successfully!");

        setCompose(false);
        setSent(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="compose-page">
        <h2
          className="back-btn"
          onClick={() => setCompose(false)}
        >
          ← Compose New Email
        </h2>

        <div className="compose-box">
          <label>From</label>
          <input value="oliver.brown@domain.io" readOnly />

          <label>To</label>
          <input
            type="email"
            placeholder="recipient@example.com"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />

          <label>Subject</label>
          <input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label>Message</label>
          <textarea
            placeholder="Type Your Reply..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

        <label>Schedule Date & Time</label>
<input
  type="datetime-local"
  value={scheduledAt}
  min={new Date(Date.now() + 60 * 1000)
    .toISOString()
    .slice(0, 16)}
  onChange={(e) => setScheduledAt(e.target.value)}
/>
          

          <div className="compose-actions">
            <button
              onClick={() => setCompose(false)}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="send-btn"
              onClick={handleScheduleEmail}
              disabled={saving}
            >
              {saving ? "Scheduling..." : "Schedule Email"}
            </button>
          </div>
        </div>
      </div>
    );
  }

 

  // EMAIL DETAIL PAGE
  if (emailDetail) {
    return (
      <div className="dashboard">

        <aside className="sidebar">
          <h1>ONB</h1>

          <div className="profile">
            <div className="avatar">O</div>

            <div>
              <strong>Oliver Brown</strong>
              <small>oliver.brown@domain.io</small>
            </div>
          </div>

          <button
            className="compose-btn"
            onClick={() => {
              setEmailDetail(false)
              setCompose(true)
            }}
          >
            + Compose
          </button>

          <nav>
            
<div
  className={`nav-item ${emailFilter === "scheduled" ? "active" : ""}`}
  onClick={() => {
    setEmailFilter("scheduled");
    setSent(false);
    setEmailDetail(false);
  }}
>
  📅 Scheduled
  <span>
    {emails.filter((email) => email.status === "scheduled").length}
  </span>
</div>


           
            
<div
  className={`nav-item ${emailFilter === "sent" ? "active" : ""}`}
  onClick={() => {
    setEmailFilter("sent");
    setSent(false);
    setEmailDetail(false);
     setCompose(false);
  }}
>
  ✈ Sent
  <span>
    {emails.filter((email) => email.status === "sent").length}
  </span>
</div>

           

          </nav>
        </aside>

        <main className="email-content">

          <header className="email-header">

            <button
              className="back-email"
              onClick={() => setEmailDetail(false)}
            >
              ←
            </button>

          <input
  type="text"
  placeholder="Search by subject or recipient..."
  className="search"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
            
            <div className="header-icons">
              🔔 &nbsp; ⚙️
            </div>

          </header>

          <section className="email-detail">

            <div className="detail-top">
              <h2>Project Update</h2>

              <span className="sent-status">
                Sent · Tue 10:00 AM
              </span>
            </div>

            <div className="recipient">
              <div className="sent-avatar">
                A
              </div>

              <div>
                <strong>To: Sarah Wilson</strong>
                <p>Sarah Wilson</p>
              </div>
            </div>

            <div className="email-body">

              <p>Hi Sarah,</p>

              <p>
                Thanks for the update. Everything looks good
                from my side.
              </p>

              <p>
                Please let me know if there are any further
                changes required.
              </p>

              <p>
                Best regards,<br />
                Oliver Brown
              </p>

            </div>

          </section>

        </main>
      </div>
    )
  }

  // SENT EMAILS PAGE
  if (sent) {
    return (
      <div className="dashboard">

        <aside className="sidebar">
          <h1>ONB</h1>

          <div className="profile">
            <div className="avatar">O</div>

            <div>
              <strong>Oliver Brown</strong>
              <small>oliver.brown@domain.io</small>
            </div>
          </div>

          <button
            className="compose-btn"
            onClick={() => setCompose(true)}
          >
            + Compose
          </button>
         
<nav>
  <div
    className={`nav-item ${emailFilter === "scheduled" ? "active" : ""}`}
    onClick={() => {
      setEmailFilter("scheduled");
      setSent(false);
      setEmailDetail(false);
        setCompose(false);
    }}
  >
    📅 Scheduled
    <span>
      {emails.filter((email) => email.status === "scheduled").length}
    </span>
  </div>

  <div
    className={`nav-item ${emailFilter === "sent" ? "active" : ""}`}
    onClick={() => {
      setEmailFilter("sent");
      setSent(true);
      setEmailDetail(false);
    }}
  >
    ✈ Sent
    <span>
      {emails.filter((email) => email.status === "sent").length}
    </span>
  </div>
</nav>

          
        </aside>

        <main className="email-content">

          <header className="email-header">

            <input
              type="text"
              placeholder="Search"
              className="search"
            />

            <div className="header-icons">
              🔔 &nbsp; ⚙️
            </div>

          </header>

          <section className="email-list">

            <h2 className="sent-title">
              Sent Emails
            </h2>

            <div
              className="email-row"
              onClick={() => setEmailDetail(true)}
            >

              <div className="sender">
                👤
                <strong>To: Sarah Wilson</strong>
              </div>

              <div className="email-details">
                <span>Sent · Tue 10:00 AM</span>

                <strong>
                  Project Update
                </strong>

                <p>
                  Thanks for the update, Sarah. Looks good.
                </p>
              </div>

            </div>

            <div
              className="email-row"
              onClick={() => setEmailDetail(true)}
            >

              <div className="sender">
                👤
                <strong>To: Support</strong>
              </div>

              <div className="email-details">
                <span>Sent · Mon 2:30 PM</span>

                <strong>
                  Issue with login
                </strong>

                <p>
                  I am having trouble logging in to the
                  dashboard...
                </p>
              </div>

            </div>

          </section>

        </main>
      </div>
    )
  }

  // SCHEDULED / DASHBOARD PAGE
  return (
    <div className="dashboard">

      <aside className="sidebar">

        <h1>ONB</h1>

        <div className="profile">
          <div className="avatar">O</div>

          <div>
            <strong>Oliver Brown</strong>
            <small>oliver.brown@domain.io</small>
          </div>
        </div>

        <button
          className="compose-btn"
          onClick={() => setCompose(true)}
        >
          + Compose
        </button>

        <nav>

          <div className="nav-item active">
            📅 Scheduled
            <span>2</span>
          </div>

          <div
            className="nav-item"
            onClick={() => setSent(true)}
          >
            ✈ Sent
            <span>10</span>
          </div>

        </nav>

      </aside>

      <main className="email-content">

        <header className="email-header">

          
<input
  type="text"
  placeholder="Search by subject or recipient..."
  className="search"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>


          <div className="header-icons">
            🔔 &nbsp; ⚙️
          </div>

        </header>
    
<div className="upload-section">
  <h3>Upload CSV / TXT</h3>
  <input
    type="file"
    accept=".csv,.txt"
    id="email-file"
  />
  <button
    onClick={async () => {
      const input = document.getElementById(
        "email-file"
      ) as HTMLInputElement;

      const file = input.files?.[0];

      if (!file) {
        alert("Please select a CSV or TXT file.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(
          "http://localhost:5000/api/emails/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Upload failed");
        }

        alert(data.message);

        const emailsResponse = await fetch(
          "http://localhost:5000/api/emails"
        );

        if (emailsResponse.ok) {
          setEmails(await emailsResponse.json());
        }
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Upload failed"
        );
      }
    }}
  >
    Upload & Schedule
  </button>
</div>
    
<section className="email-list">
  <h2>All Emails</h2>

  {loadingEmails ? (
    <p>Loading emails...</p>
  ) : filteredEmails.length === 0 ?  (
    <p>No emails found.</p>
  ) : (
      filteredEmails.map((email) => (
      <div className="email-row" key={email.id}>
        <div className="sender">
          👤
          <strong>To: {email.recipient}</strong>
        </div>

        <div className="email-details">
          <span className="scheduled-time">
            🕐 {new Date(email.scheduled_at).toLocaleString()}
          </span>

          <strong> Sub: {email.subject}</strong>
          <p>{email.message}</p>
          
<span className={`status-badge ${email.status}`}>
  {email.status === "sent" ? "Sent" : "Scheduled"}
</span>

        </div>
      </div>
    ))
  )}
</section>


      </main>

    </div>
  )
}

export default App