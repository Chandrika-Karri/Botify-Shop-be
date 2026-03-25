import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import productsRouter from "./routes/products";
import cartRouter from "./routes/cart";
import ordersRouter from "./routes/orders";
import categoriesRouter from "./routes/categories";
import authRouter from "./routes/auth";
import adminRoutes from "./routes/admins";
import webhookRouter from "./webhook";
import paymentsRouter from "./routes/payment";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

/**
 * ✅ Stripe webhook MUST come BEFORE express.json()
 */
app.use("/api/webhook", express.raw({ type: "application/json" }));
app.use("/api/webhook", webhookRouter);

/**
 * ✅ Now normal JSON parsing for rest of routes
 */
app.use(express.json());


// Routes
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