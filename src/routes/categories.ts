import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });

  res.json(categories.map(c => c.category));
});

export default router;
