import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
  }
});

app.post("/upload", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing file URL" });

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const filename = `bubble-${Date.now()}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      Body: response.body, // Streaming directly
      ContentType: contentType
    });

    await s3.send(command);

    const finalUrl = `${R2_BASE_URL}/${filename}`;
    return res.json({ success: true, url: finalUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running...");
});
