import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import routes from "./routes/index.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const uploadDir = path.join(process.cwd(), "uploads");
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

fs.mkdirSync(uploadDir, { recursive: true });

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(uploadDir));
app.use("/api", routes);
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`PDV API listening on port ${port}`);
});
