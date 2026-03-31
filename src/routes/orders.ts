import { Router } from "express";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/authMiddleware";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-02-25.clover" });

const router = Router();

// GET /api/orders
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const { page = "1", limit = "10", status, userId, allUsers } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {};

    // Non-admin users only see their orders
    if (allUsers !== "true") {
      where.email = req.user.email;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      total,
    });
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /api/orders - create order AFTER payment succeeds
router.post("/", authMiddleware, async (req, res) => {
  const { paymentIntentId, items, address } = req.body as {
    paymentIntentId: string;
    items: { productId: string; quantity: number }[];
    address: string;
  };

  if (!paymentIntentId) return res.status(400).json({ error: "PaymentIntent ID is required" });
  if (!items || items.length === 0) return res.status(400).json({ error: "Cart items required" });
  if (!address) return res.status(400).json({ error: "Shipping address required" });

  try {
    // 1️⃣ Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: "Payment not completed" });
    }
    
    if (!req.user) return res.status(401).json({ error: "User not logged in" });
    const userEmail = req.user.email;
    const userName = req.user.name;

    // 2️⃣ Fetch products from DB
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let total = 0;
    const orderItemsData = items.map((i) => {
      const product = productMap.get(i.productId);
      if (!product) throw new Error(`Product not found: ${i.productId}`);
      if (product.stock < i.quantity) throw new Error(`Not enough stock for ${product.name}`);
      total += product.price * i.quantity;
      return { productId: product.id, quantity: i.quantity, price: product.price };
    });

    // 3️⃣ Transaction: update stock + create order
    const order = await prisma.$transaction(async (tx) => {
      for (const item of orderItemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return await tx.order.create({
        data: {
          name: userName,
          email: userEmail,
          address,
          total,
          status: "paid",
          items: { create: orderItemsData },
        },
        include: { items: { include: { product: true } } },
      });
    });

    res.status(201).json({
      ...order,
      items: order.items.map((i) => ({
        ...i,
        product: { ...i.product, images: i.product.images  },
      })),
    });
  } catch (err: any) {
    console.error("Order creation error:", err);
    res.status(400).json({ error: err.message || "Failed to create order" });
  }
});

export default router;