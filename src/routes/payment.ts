import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

// Define CartItem type
interface CartItem {
  productId: string;
  quantity: number;
}

interface PaymentIntentRequestBody {
  items: CartItem[];
  currency?: string;
}

router.post(
  "/create-payment-intent",
  authMiddleware, // Require logged-in user
  async (req, res) => {
    try {
      const { items, currency = "usd" } = req.body as PaymentIntentRequestBody;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart items are required" });
      }

      let amount = 0;
      const productIds = items.map((i: any) => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));
      
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) return res.status(404).json({ error: `Product not found: ${item.productId}` });
        amount += product.price * item.quantity * 100; // Stripe expects cents
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        automatic_payment_methods: { enabled: true },
      });

      res.status(200).json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error("Stripe error:", err);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  }
);

export default router;