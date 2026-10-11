import express from "express";
import cors from "cors";
import helmet from "helmet";
import studentRoutes from "./routes/studentRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
  })
);

app.use(express.json());
app.use("/api/students", studentRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MERN FDP API is running",
  });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

app.use((error, _req, res, _next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Request body contains invalid JSON" });
  }

  return res.status(500).json({ success: false, message: "An unexpected server error occurred" });
});

export default app;
