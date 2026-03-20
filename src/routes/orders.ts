import { Router } from "express";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/authMiddleware"; // JWT middleware

const router = Router();

// POST /api/orders - place order
router.post("/", authMiddleware, async (req, res) => {
  const { address, items } = req.body as {
    address?: string;
    items?: { productId: string; quantity: number }[];
  };

  if (!address) return res.status(400).json({ error: "Address is required" });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "Items must be a non-empty array" });

  const userEmail = req.user.email;
  const userName = req.user.name;

  try {
    // 1️⃣ Load products
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const foundIds = new Set(products.map((p) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0)
      return res.status(404).json({ error: `Product not found: ${missing[0]}` });

    // 2️⃣ Prepare order items and total
    let total = 0;
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderItemsData = items.map((i) => {
      const qty = typeof i.quantity === "number" && i.quantity > 0 ? i.quantity : 1;
      const product = productMap.get(i.productId)!;
      total += product.price * qty;
      return { productId: product.id, quantity: qty, price: product.price };
    });

    // 3️⃣ Transaction: decrease stock + create order
    const order = await prisma.$transaction(async (tx) => {
      for (const item of orderItemsData) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error("Product not found");
        if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);

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
          status: "pending",
          items: { create: orderItemsData },
        },
        include: { items: { include: { product: true } } },
      });
    });

    res.status(201).json({
      ...order,
      items: order.items.map((i) => ({
        ...i,
        product: { ...i.product, images: JSON.parse(i.product.images) },
      })),
    });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/orders - list orders with role-based access
router.get("/", authMiddleware, async (req, res) => {
  const userRole = req.user.role;
  const userEmail = req.user.email;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const status = req.query.status as string | undefined;
  const userFilter = req.query.userId as string | undefined;
  const allUsers = req.query.allUsers === "true";

  let whereClause: any = {};

  if (userRole === "user") {
    whereClause.email = userEmail;
  } else if (userRole === "admin" || userRole === "super_admin") {
    if (!allUsers) {
      if (userFilter && userFilter !== "all") {
        whereClause.email = userFilter; // adjust based on your schema (email or userId)
      }
    }
  }

  if (status && status !== "all") whereClause.status = status;

  try {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { items: { include: { product: true } } },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    res.json({
      orders: orders.map((o) => ({
        ...o,
        items: o.items.map((i) => ({
          ...i,
          product: { ...i.product, images: JSON.parse(i.product.images) },
        })),
      })),
      total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;