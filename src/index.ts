import express from "express";
import cors from "cors";
import productsRouter from "./routes/products";
import cartRouter from "./routes/cart";
import ordersRouter from "./routes/orders";
import categoriesRouter from "./routes/categories";
import authRouter from "./routes/auth";
import adminRoutes from "./routes/admins";
import webhookRouter from "./webhook";
import paymentsRouter from "./routes/payment";

// --------------------
// Use cPanel environment variables only
// --------------------
// Do NOT load dotenv files
// const envFile = ...; dotenv.config({ path: envFile }); <-- removed

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables");
}
console.log(
  "Stripe key loaded:",
  process.env.STRIPE_SECRET_KEY.slice(0, 4) + "****"
);

const app = express();
const PORT = Number(process.env.PORT) || 3000; // use PORT from cPanel env

app.use(cors());

// Webhook
app.use("/api/webhook", express.raw({ type: "application/json" }));
app.use("/api/webhook", webhookRouter);

// JSON parsing
app.use(express.json());

// API routes
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/auth", authRouter);
app.use("/api/admins", adminRoutes);
app.use("/api", paymentsRouter);

// Static uploads
app.use("/uploads", express.static("uploads"));

// Health check route
app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Botify Shop Backend is running" });
});

// Root route so base URL doesn't 404
app.get("/", (_req, res) => {
  res.send("Botify Shop Backend is running. Use /api endpoints or /health.");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});