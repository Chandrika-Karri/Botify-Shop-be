import dotenv from "dotenv";
import path from "path";

const envFile = `.env.${process.env.NODE_ENV || "local"}`;

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
});

console.log("Loaded env file:", envFile);
console.log("Stripe Key Exists:", !!process.env.STRIPE_SECRET_KEY);

import express from "express";
import cors from "cors";
import Stripe from "stripe";

import productsRouter from "./routes/products";
import cartRouter from "./routes/cart";
import ordersRouter from "./routes/orders";
import categoriesRouter from "./routes/categories";
import authRouter from "./routes/auth";
import adminRoutes from "./routes/admins";
import webhookRouter from "./webhook";
import paymentsRouter from "./routes/payment";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY in environment variables. Set it in .env for local dev or in production."
  );
}

console.log(
  "Stripe key loaded:",
  process.env.STRIPE_SECRET_KEY.slice(0, 6) + "****"
);


export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2026-02-25.clover",
});


const app = express();
const PORT = Number(process.env.PORT) || 3000;

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
app.use("/api", paymentsRouter);


app.use("/uploads", express.static("uploads"));


app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    message: "Botify Shop Backend is running",
    environment: process.env.NODE_ENV,
  });
});


app.get("/", (_req, res) => {
  res.send("Botify Shop Backend is running. Use /api endpoints.");
});


app.listen(PORT, () => {
  console.log(`
🚀 Server running
📍 Environment: ${process.env.NODE_ENV}
🌐 URL: http://localhost:${PORT}
💳 Stripe: Connected
`);
});