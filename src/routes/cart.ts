import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * GET /api/cart
 * Returns cart items with product details
 */
router.get("/", async (_req, res) => {
  const items = await prisma.cartItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { product: true }
  });

  res.json(
    items.map((i) => ({
      ...i,
      product: {
        ...i.product,
        images: JSON.parse(i.product.images)
      }
    }))
  );
});

/**
 * POST /api/cart
 * Body: { productId: string, quantity?: number }
 */
router.post("/", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "Body is required" });

  const { productId, quantity } = req.body as { productId?: string; quantity?: number };

  if (!productId) return res.status(400).json({ error: "productId is required" });

  const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const existing = await prisma.cartItem.findFirst({ where: { productId } });

  const item = existing
    ? await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + qty },
        include: { product: true }
      })
    : await prisma.cartItem.create({
        data: { productId, quantity: qty },
        include: { product: true }
      });

  res.status(existing ? 200 : 201).json({
    ...item,
    product: {
      ...item.product,
      images: JSON.parse(item.product.images)
    }
  });
});

/**
 * PUT /api/cart/:id
 * Body: { quantity: number }
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  if (!req.body) return res.status(400).json({ error: "Body is required" });

  const { quantity } = req.body as { quantity?: number };
  if (typeof quantity !== "number") return res.status(400).json({ error: "quantity must be a number" });
  if (quantity < 1) return res.status(400).json({ error: "quantity must be >= 1" });

  try {
    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: { product: true }
    });

    res.json({
      ...updated,
      product: {
        ...updated.product,
        images: JSON.parse(updated.product.images)
      }
    });
  } catch {
    res.status(404).json({ error: "Cart item not found" });
  }
});

/**
 * DELETE /api/cart/:id
 * Removes one cart item
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.cartItem.delete({ where: { id } });
    res.json({ message: "Cart item deleted" });
  } catch {
    res.status(404).json({ error: "Cart item not found" });
  }
});

/**
 * DELETE /api/cart
 * Clears whole cart
 */
router.delete("/", async (_req, res) => {
  await prisma.cartItem.deleteMany();
  res.json({ message: "Cart cleared" });
});

export default router;
