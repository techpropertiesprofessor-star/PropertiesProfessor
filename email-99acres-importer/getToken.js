/**
 * Run this once to generate token.json for Gmail API access.
 * Usage: node getToken.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");
const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_secret, client_id, redirect_uris } =
  credentials.installed || credentials.web;

const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = auth.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("\nOpen this URL in your browser and authorize the app:\n");
console.log(authUrl);
console.log(
  "\nAfter approving, Google will redirect to http://localhost/?code=XXXX..."
);
console.log("Copy the 'code' value from the URL and paste it below.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Paste the authorization code here: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await auth.getToken(code.trim());
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("\ntoken.json saved successfully. You can now run server.js.");
  } catch (err) {
    console.error("\nFailed to exchange code for token:", err.message);
  }
});
