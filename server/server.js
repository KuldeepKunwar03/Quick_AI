import express from "express";
import cors from "cors";
import net from "node:net";
import "dotenv/config";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { auth } from "./middlewares/auth.js";
import aiRouter from "./routes/aiRoutes.js";
import connnectCloudinary from "./configs/coudinary.js";

const app = express();

// Neon, Cloudinary and Gemini all advertise IPv6 addresses this network can't route,
// and their IPv4 connect takes ~300ms — longer than the 250ms after which Node's
// Happy Eyeballs abandons an attempt. Every outbound fetch then failed with a bare
// "fetch failed". Give each attempt room to finish instead.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

await connnectCloudinary()

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Public route
app.get("/", (req, res) => {
  res.send("Server is Live!");
});

// Protect every route after "/"
app.use((req, res, next) => {
  const { isAuthenticated } = getAuth(req);

  if (!isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
});

app.use('/api/ai', aiRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log("Server is running on port", PORT)
})
