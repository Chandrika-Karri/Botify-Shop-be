import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = Router();

// -------------------------
// Multer setup
// -------------------------
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

// -------------------------
// Helpers
// -------------------------
const parseImages = (images: any): string[] => {
  if (Array.isArray(images)) return images;
  try {
    return images ? JSON.parse(images) : [];
  } catch {
    return [];
  }
};

const formatProduct = (p: any) => ({
  ...p,
  images: parseImages(p.images),
});

// -------------------------
// GET all products
// -------------------------
router.get("/", async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(products.map(formatProduct));
});

// -------------------------
// GET product by ID
// -------------------------
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const product = await prisma.product.findUnique({ where: { id: String(id) } });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(formatProduct(product));
});

// -------------------------
// CREATE product (super_admin only)
// -------------------------
router.post(
  "/",
  authMiddleware,
  authorizeRoles("super_admin"),
  upload.array("images", 5),
  async (req: Request, res: Response) => {
    const { name, price, description, category, stock } = req.body;

    if (!name || price == null || !description || !category || stock == null) {
      return res.status(400).json({ error: "All fields including stock are required" });
    }

    const parsedStock = parseInt(stock);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: "Invalid stock value" });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const images = files ? files.map((f) => `/${uploadDir}/${f.filename}`) : [];

    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        description,
        category,
        stock: parsedStock,
        images,
      },
    });

    res.status(201).json(formatProduct(product));
  }
);

// -------------------------
// UPDATE product (super_admin only, no stock change)
// -------------------------
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("super_admin"),
  upload.array("images", 5),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, price, description, category, existingImages } = req.body;

    if (!name || price == null || !description || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      const product = await prisma.product.findUnique({ where: { id: String(id) } });
      if (!product) return res.status(404).json({ error: "Product not found" });

      // parse existing images
      const oldImages = (() => {
        if (!existingImages) return [];
        if (Array.isArray(existingImages)) return existingImages;
        try {
          return JSON.parse(existingImages);
        } catch {
          return [];
        }
      })();

      const files = req.files as Express.Multer.File[] | undefined;
      const newImages = files ? files.map((f) => `/${uploadDir}/${f.filename}`) : [];

      const allImages = [...oldImages, ...newImages];

      const updated = await prisma.product.update({
        where: { id: String(id) },
        data: {
          name,
          price: Number(price),
          description,
          category,
          images: allImages,
          // stock NOT updated here
        },
      });

      res.json(formatProduct(updated));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update product" });
    }
  }
);

// -------------------------
// UPDATE STOCK (super_admin + admin)
// -------------------------
router.put(
  "/:id/stock",
  authMiddleware,
  authorizeRoles("super_admin", "admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { stock } = req.body;

    if (stock == null || stock < 0) {
      return res.status(400).json({ error: "Stock must be a non-negative number" });
    }

    try {
      const updated = await prisma.product.update({
        where: { id: String(id) },
        data: { stock: Number(stock) },
      });

      res.json({ message: "Stock updated successfully", product: formatProduct(updated) });
    } catch (err) {
      console.error(err);
      res.status(404).json({ error: "Product not found" });
    }
  }
);

// -------------------------
// DELETE product (super_admin only)
// -------------------------
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("super_admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      await prisma.product.delete({ where: { id: String(id) } });
      res.json({ message: "Product deleted successfully" });
    } catch {
      res.status(404).json({ error: "Product not found" });
    }
  }
);

export default router;