import path from "path";
import dotenv from "dotenv";

// Load .env file based on NODE_ENV before anything else
const envFile =
  process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "../.env.production")
    : path.resolve(__dirname, "../.env.local");

dotenv.config({ path: envFile });

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables");
}
console.log("Stripe key loaded:", process.env.STRIPE_SECRET_KEY.slice(0, 4) + "****");

// Now import the rest
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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.use("/api/webhook", express.raw({ type: "application/json" }));
app.use("/api/webhook", webhookRouter);

app.use(express.json());

app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/auth", authRouter);
app.use("/api/admins", adminRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api", paymentsRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Botify Shop Backend is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});