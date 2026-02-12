import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * POST /api/orders
 * Body:
 * {
 *   "name": "John",
 *   "email": "john@gmail.com",
 *   "address": "Dhaka, Bangladesh",
 *   "items": [
 *     { "productId": "xxx", "quantity": 2 },
 *     { "productId": "yyy", "quantity": 1 }
 *   ]
 * }
 */
router.post("/", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "Body is required" });

  const { name, email, address, items } = req.body as {
    name?: string;
    email?: string;
    address?: string;
    items?: { productId: string; quantity: number }[];
  };

  if (!name || !email || !address) {
    return res.status(400).json({ error: "name, email, address are required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }

  // Load all products for validation + pricing
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  // Validate productId list
  const foundIds = new Set(products.map((p) => p.id));
  const missing = productIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    return res.status(404).json({ error: `Product not found: ${missing[0]}` });
  }

  // Calculate total + create order items
  const productMap = new Map(products.map((p) => [p.id, p]));
  let total = 0;

  const orderItemsData = items.map((i) => {
    const qty = typeof i.quantity === "number" && i.quantity > 0 ? i.quantity : 1;
    const product = productMap.get(i.productId)!;

    total += product.price * qty;

    return {
      productId: product.id,
      quantity: qty,
      price: product.price,
    };
  });

  const order = await prisma.order.create({
    data: {
      name,
      email,
      address,
      total,
      items: { create: orderItemsData },
    },
    include: {
      items: { include: { product: true } },
    },
  });

  // Clear cart after order (optional but common)
  await prisma.cartItem.deleteMany();

  res.status(201).json({
    ...order,
    items: order.items.map((i) => ({
      ...i,
      product: {
        ...i.product,
        images: JSON.parse(i.product.images),
      },
    })),
  });
});

/**
 * GET /api/orders
 * (Optional, for testing)
 */
router.get("/", async (_req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });

  res.json(
    orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({
        ...i,
        product: { ...i.product, images: JSON.parse(i.product.images) },
      })),
    }))
  );
});

export default router;
