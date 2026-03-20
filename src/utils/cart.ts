import { prisma } from "../prisma";

// Merge guest cart into user cart
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
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { userId, sessionId: null },
      });
    }
  }
};