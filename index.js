import express from "express";
import fetch from "node-fetch";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config();

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
    if (!response.ok) throw new Error("Failed to download file");

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const filename = url.split("/").pop().split("?")[0]; // strip filename from URL
    const key = `bubble-uploaded/${Date.now()}-${filename}`;

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: response.body,
      ContentType: contentType
    }));

    const publicUrl = `${R2_BASE_URL}/${key}`;

    return res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Bubble to R2 uploader is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running...");
});
