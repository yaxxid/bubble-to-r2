import express from "express";
import fetch from "node-fetch";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const {
  R2_BUCKET,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BASE_URL
} = process.env;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
});

app.post("/upload", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing file URL" });

    const filename = `bubble-${Date.now()}`;
    const finalUrl = `${R2_BASE_URL}/${filename}`;

    // Respond immediately so the client doesn't time out
    res.json({ success: true, url: finalUrl, status: "uploading" });

    // Continue the streaming upload in background
    (async () => {
      try {
        console.time("fetch");
        const response = await fetch(url);
        console.timeEnd("fetch");

        if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);

        const contentType = response.headers.get("content-type") || "application/octet-stream";

        console.time("upload");
        const upload = new Upload({
          client: s3,
          params: {
            Bucket: R2_BUCKET,
            Key: filename,
            Body: response.body, // streaming intact
            ContentType: contentType
          },
          leavePartsOnError: false
        });

        await upload.done();
        console.timeEnd("upload");

        console.log(`✅ Upload complete: ${finalUrl}`);
      } catch (err) {
        console.error(`❌ Upload failed for ${url}:`, err);
      }
    })();
  } catch (err) {
    console.error("Upload error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
});

app.listen(3000, () => {
  console.log("Server running...");
});
