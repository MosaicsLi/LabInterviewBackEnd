import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(cors());
  const PORT = 3001;

  app.use(express.json());

  // API to exchange authorization code for tokens
  app.post("/api/auth/google/token", async (req, res) => {
    const { code, redirectUri } = req.body;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientSecret || clientSecret === clientId) {
      console.error("GOOGLE_CLIENT_SECRET is missing or incorrectly set to Client ID");
      return res.status(500).json({ error: "Server configuration error: Invalid Client Secret" });
    }

    try {
      const params = new URLSearchParams();
      params.append("code", code);
      params.append("client_id", clientId!);
      params.append("client_secret", clientSecret);
      params.append("redirect_uri", redirectUri);
      params.append("grant_type", "authorization_code");

      const response = await axios.post("https://oauth2.googleapis.com/token", params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Token exchange error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to exchange code for tokens", details: error.response?.data });
    }
  });

  // API to refresh access token
  app.post("/api/auth/google/refresh", async (req, res) => {
    const { refreshToken } = req.body;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    try {
      const params = new URLSearchParams();
      params.append("refresh_token", refreshToken);
      params.append("client_id", clientId!);
      params.append("client_secret", clientSecret!);
      params.append("grant_type", "refresh_token");

      const response = await axios.post("https://oauth2.googleapis.com/token", params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Token refresh error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to refresh token", details: error.response?.data });
    }
  });

  // OAuth Callback Route (returns HTML to close popup and postMessage)
  app.get("/auth/callback", (req, res) => {
    const { code, error } = req.query;

    res.send(`
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            if (window.opener) {
              const data = ${JSON.stringify({ type: "OAUTH_RESPONSE", code, error })};
              window.opener.postMessage(data, "*");
              window.close();
            } else {
              window.location.href = "/";
            }
          </script>
          <p>Processing authentication... This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ LabInterviewServer Proxy running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
