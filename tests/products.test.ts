import request from "supertest";
import express from "express";
import productsRouter from "../src/routes/products";
import { prisma } from "../src/prisma";

const app = express();
app.use(express.json());
app.use("/api/products", productsRouter);

describe("Product category filtering", () => {
  beforeAll(async () => {
    // clear + seed small test data
    await prisma.product.deleteMany();

    await prisma.product.createMany({
      data: [
        {
          id: "1",
          name: "Robot A",
          price: 100,
          description: "A",
          category: "Cleaning robots",
          images: JSON.stringify([]),
          stock: 1
        },
        {
          id: "2",
          name: "Robot B",
          price: 200,
          description: "B",
          category: "Delivery robots",
          images: JSON.stringify([]),
          stock: 1
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns only products from selected category", async () => {
    const res = await request(app).get("/api/products?category=Cleaning robots");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].category).toBe("Cleaning robots");
  });
});
