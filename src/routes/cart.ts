import { Router } from "express";
import { prisma } from "../prisma";
import crypto from "crypto";

const router = Router();

// -------------------------
// Merge Guest Cart
// -------------------------
export const mergeGuestCart = async (userId: string, sessionId?: string) => {
  if (!sessionId) return;

  const guestItems = await prisma.cartItem.findMany({
    where: { sessionId },
  });

  for (const item of guestItems) {
    const existing = await prisma.cartItem.findFirst({
      where: { userId, productId: item.productId },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });

      await prisma.cartItem.delete({
        where: { id: item.id },
      });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: {
          userId,
          sessionId: null,
        },
      });
    }
  }
};

// -------------------------
// Get identifiers
// -------------------------
const getCartIdentifiers = (req: any) => {
  const userId = req.user?.userId ?? null;
  const sessionId = req.headers["x-session-id"] as string | undefined;

  return { userId, sessionId };
};

// -------------------------
// GET CART
// -------------------------
router.get("/", async (req, res) => {
  try {
    const { userId, sessionId } = getCartIdentifiers(req);

    if (userId && sessionId) {
      await mergeGuestCart(userId, sessionId);
    }

    const items = await prisma.cartItem.findMany({
      where: userId ? { userId } : { sessionId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    const response = items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        images: Array.isArray(item.product.images)
          ? item.product.images
          : JSON.parse(item.product.images),
      },
    }));

    res.json(response);
  } catch (error) {
    console.error("Cart fetch error:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// -------------------------
// ADD TO CART
// -------------------------
router.post("/", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const { userId, sessionId } = getCartIdentifiers(req);

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ error: "productId and quantity are required" });
    }

    const existing = await prisma.cartItem.findFirst({
      where: {
        productId,
        ...(userId ? { userId } : { sessionId }),
      },
    });

    let item;

    if (existing) {
      item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
        },
      });
    } else {
      item = await prisma.cartItem.create({
        data: {
          productId,
          quantity,
          userId: userId || null,
          sessionId: userId ? null : sessionId,
        },
      });
    }

    res.json(item);
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

// -------------------------
// UPDATE QUANTITY
// -------------------------
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res
        .status(400)
        .json({ error: "Quantity must be greater than 0" });
    }

    const item = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });

    res.json(item);
  } catch (error) {
    console.error("Cart update error:", error);
    res.status(500).json({ error: "Failed to update cart item" });
  }
});

// -------------------------
// REMOVE ITEM
// -------------------------
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.cartItem.delete({
      where: { id },
    });

    res.json({ message: "Item removed from cart" });
  } catch (error) {
    console.error("Cart delete error:", error);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

// -------------------------
// CLEAR CART
// -------------------------
router.delete("/", async (req, res) => {
  try {
    const { userId, sessionId } = getCartIdentifiers(req);

    await prisma.cartItem.deleteMany({
      where: userId ? { userId } : { sessionId },
    });

    res.json({ message: "Cart cleared" });
  } catch (error) {
    console.error("Cart clear error:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

export default router;