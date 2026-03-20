import { Router } from "express";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/authMiddleware"; // JWT verification middleware
import bcrypt from "bcrypt";

const router = Router();

// All routes protected, only super_admin can access
router.use(authMiddleware, (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
});

// ✅ CREATE admin
router.post("/", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });

  // check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "User already exists" });

  // create admin
  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: "admin" },
  });

  res.status(201).json({ message: "Admin created", admin });
});

// ✅ READ all admins
router.get("/", async (_req, res) => {
  const admins = await prisma.user.findMany({ where: { role: "admin" } });
  res.json(admins);
});

// ✅ UPDATE admin (name, email, role)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  const data: any = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role && ["admin", "user"].includes(role)) data.role = role; // super_admin role cannot be assigned

  try {
    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ message: "Admin updated", updated });
  } catch {
    res.status(404).json({ error: "Admin not found" });
  }
});

// ✅ DELETE admin with super-admin protection
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Prevent deletion of super-admin
    if (userToDelete.role === "super_admin") {
      return res.status(403).json({ error: "Cannot delete super admin" });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "Admin deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete admin" });
  }
});

export default router;