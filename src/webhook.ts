import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { prisma } from "./prisma";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});


router.post(
  "/webhook",
  // @ts-ignore
  require("express").raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("Webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // =====================================================
    // 🎯 Handle payment success
    // =====================================================
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      try {
        const metadata = paymentIntent.metadata;

        // 🔥 Parse items from metadata
        const items = JSON.parse(metadata.items || "[]");
        const address = metadata.address;
        const name = metadata.name;
        const email = metadata.email;
  

        if (!items.length) throw new Error("No items in metadata");

        // 🔁 Prevent duplicate orders
        const existing = await prisma.order.findFirst({
          where: { paymentId: paymentIntent.id },
        });

        if (existing) {
          console.log("Order already exists");
          return res.json({ received: true });
        }

        // 🛒 Load products
        const productIds = items.map((i: any) => i.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        let total = 0;

        const orderItemsData = items.map((i: any) => {
          const product = productMap.get(i.productId);
          if (!product) throw new Error("Product not found");

          total += product.price * i.quantity;

          return {
            productId: product.id,
            quantity: i.quantity,
            price: product.price,
          };
        });

        // 🔁 Transaction
        await prisma.$transaction(async (tx) => {
          for (const item of orderItemsData) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });

            if (!product || product.stock < item.quantity) {
              throw new Error("Stock issue");
            }

            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity },
              },
            });
          }

          await tx.order.create({
            data: {
              name,
              email,
              address,
              total,
              status: "completed",
              paymentId: paymentIntent.id,
              items: {
                create: orderItemsData,
              },
            },
          });
        });

        console.log("✅ Order created from webhook");
      } catch (err) {
        console.error("Webhook order error:", err);
      }
    }

    res.json({ received: true });
  }
);

export default router;