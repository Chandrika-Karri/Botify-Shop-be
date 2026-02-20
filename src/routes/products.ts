import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

// ✅ GET all products OR filter by category
router.get("/", async (req, res) => {
  // await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate delay
  const { categories } = req.query;

  const categoryArray = typeof categories === "string" ? categories.split(",").map(c => c.trim()) : [];

  const products = await prisma.product.findMany({
    where: categoryArray.length > 0 ? { category: { in: categoryArray } } : {},
    orderBy: { createdAt: "desc" },
  });

  res.json(
    products.map((p) => ({
      ...p,
      images: JSON.parse(p.images),
    }))
  );
});

// ✅ GET product by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  res.json({
    ...product,
    images: JSON.parse(product.images)
  });
});


// ✅ CREATE product (POST)
router.post("/", async (req, res) => {
  if (!req.body) return res.status(400).json({ error: "Body is required" });

  const { name, price, description, category, images } = req.body;

  if (!name || typeof name !== "string") return res.status(400).json({ error: "name is required" });
  if (typeof price !== "number") return res.status(400).json({ error: "price must be a number" });
  if (!description || typeof description !== "string") return res.status(400).json({ error: "description is required" });
  if (!category || typeof category !== "string") return res.status(400).json({ error: "category is required" });

  const imgs = Array.isArray(images) ? images : [];

  const product = await prisma.product.create({
    data: {
      name,
      price,
      description,
      category,
      images: JSON.stringify(imgs)
    }
  });

  res.status(201).json({
    ...product,
    images: JSON.parse(product.images)
  });
});

// ✅ UPDATE product (PUT) — partial update allowed
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  if (!req.body) return res.status(400).json({ error: "Body is required" });

  const { name, price, description, category, images } = req.body;

  const data: any = {};

  if (name !== undefined) {
    if (typeof name !== "string") return res.status(400).json({ error: "name must be string" });
    data.name = name;
  }

  if (price !== undefined) {
    if (typeof price !== "number") return res.status(400).json({ error: "price must be number" });
    data.price = price;
  }

  if (description !== undefined) {
    if (typeof description !== "string") return res.status(400).json({ error: "description must be string" });
    data.description = description;
  }

  if (category !== undefined) {
    if (typeof category !== "string") return res.status(400).json({ error: "category must be string" });
    data.category = category;
  }

  if (images !== undefined) {
    if (!Array.isArray(images)) return res.status(400).json({ error: "images must be an array" });
    data.images = JSON.stringify(images);
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data
    });

    res.json({
      ...updated,
      images: JSON.parse(updated.images)
    });
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

// ✅ DELETE product
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({ where: { id } });
    res.json({ message: "Product deleted successfully" });
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

export default router;
