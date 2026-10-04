import express, { type Request, type Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// Basic Route (public by design — wm-sentinel-ignore)
app.get("/health", (req: Request, res: Response) => {
  res.json({ message: "API Working!" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
