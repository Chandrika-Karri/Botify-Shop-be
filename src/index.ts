import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import productsRouter from "./routes/products";
import cartRouter from "./routes/cart";
import ordersRouter from "./routes/orders";
import categoriesRouter from "./routes/categories";
import authRouter from "./routes/auth";
import adminRoutes from "./routes/admins";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Botify Shop Backend is running" });
});

// Routes
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/auth", authRouter);
app.use("/api/admins", adminRoutes);
app.use("/uploads", express.static("uploads"));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
