import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import { router } from "./routes/index.js";
import { cors, errorHandler, notFound, requireApiKey } from "./middleware/index.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const API_KEY = process.env.API_KEY || undefined;
// Without an API key the API is unauthenticated, so it only listens locally.
const HOST = API_KEY ? process.env.HOST || "0.0.0.0" : "127.0.0.1";
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((o) => o.trim());

app.disable("x-powered-by");
app.use(cors(CORS_ORIGINS));

// Basic Route (public by design — wm-sentinel-ignore)
app.get("/health", (req: Request, res: Response) => {
  res.json({ message: "API Working!" });
});

app.use("/api", requireApiKey(API_KEY), router);

app.use(notFound);
app.use(errorHandler);

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`Server is listening on http://${HOST}:${PORT}`);
  if (!API_KEY) console.log("API_KEY not set: /api is unauthenticated and bound to 127.0.0.1 only.");
});
