require("dotenv").config();
const Imap = require("imap");

const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: process.env.IMAP_HOST,
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once("ready", () => {
  console.log("✅ IMAP LOGIN SUCCESS");
  imap.openBox("INBOX", true, (err, box) => {
    if (err) {
      console.error("Inbox open error:", err);
    } else {
      console.log("📬 Inbox opened");
      console.log("Total emails:", box.messages.total);
    }
    imap.end();
  });
});

imap.once("error", (err) => {
  console.error("❌ IMAP LOGIN FAILED");
  console.error(err);
});

imap.once("end", () => {
  console.log("Connection closed");
});

imap.connect();