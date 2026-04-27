/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for EHR Synchronization
  app.post("/api/ehr/sync", async (req, res) => {
    const { patientId, providerName, date, note, billing } = req.body;
    
    // Simulate complex authentication/secure handshake
    const authToken = req.headers['x-ehr-secure-token'];
    
    // For this applet, we'll check if the token exists. 
    // In production, this would be a real JWT or OAuth2 bearer token.
    if (!authToken) {
       // We'll allow it for now but log a warning
       console.warn("EHR Sync: Missing secure session token. Defaulting to internal sandbox.");
    }

    console.log(`[EHR GATEWAY] Received sync request for Patient: ${patientId}`);
    
    // Simulate backend processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate success
    const syncId = `EHR-SEC-${Math.floor(Math.random() * 900000) + 100000}`;
    
    res.json({
      success: true,
      message: `Progress note and billing codes for Patient ${patientId} have been securely transmitted to MindShift Clinical EHR.`,
      syncId
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MindShift Secure Gateway running on http://localhost:${PORT}`);
  });
}

startServer();
