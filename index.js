import express from "express";
import fetch from "node-fetch";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
config();

const app = express();
app.use(express.json());

app.post("/upload/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { url, contentType } = req.body;

    if (!url || !fileId) {
      return res.status(400).json({ error: "Missing file URL or file ID" });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch file from Bubble URL");
    }

    const s3 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_BASE_URL,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const key = `uploads/${fileId}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: response.body,
      ContentType: contentType || "application/octet-stream",
    });

    await s3.send(uploadCommand);
    res.json({ success: true, r2_url: `${process.env.R2_BASE_URL}/${key}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running...");
});
