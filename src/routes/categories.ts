import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

// GET categories with product count
router.get("/", async (_req, res) => {
  const result = await prisma.product.groupBy({
    by: ["category"],
    where: { stock: { gt: 0 } },  // only products in stock
    _count: { category: true }  as const
  });

  res.json(
    result.map(r => ({
      category: r.category,
      count: r._count?.category ?? 0
    }))
  );
});

export default router;
