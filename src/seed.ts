import { prisma } from "./prisma";

async function main() {
  // Clear old data (optional)
  await prisma.product.deleteMany();

  const products = [
    {
      name: "Nike Air Max",
      price: 150,
      description: "Comfortable running shoes",
      category: "Shoes",
      images: JSON.stringify(["nike1.jpg", "nike2.jpg"]),
    },
    {
      name: "Adidas Ultraboost",
      price: 180,
      description: "High performance running shoes",
      category: "Shoes",
      images: JSON.stringify(["ultra1.jpg", "ultra2.jpg"]),
    },
    {
      name: "Puma T-Shirt",
      price: 35,
      description: "Soft cotton t-shirt",
      category: "Clothing",
      images: JSON.stringify(["puma1.jpg"]),
    },
    {
      name: "Apple Watch",
      price: 299,
      description: "Smart watch with fitness tracking",
      category: "Accessories",
      images: JSON.stringify(["watch1.jpg", "watch2.jpg"]),
    },
    {
      name: "Backpack",
      price: 59,
      description: "Everyday backpack",
      category: "Accessories",
      images: JSON.stringify(["bag1.jpg"]),
    },
    {
      name: "Denim Jacket",
      price: 89,
      description: "Classic denim jacket",
      category: "Clothing",
      images: JSON.stringify(["jacket1.jpg"]),
    },
    {
      name: "Sunglasses",
      price: 25,
      description: "UV protection sunglasses",
      category: "Accessories",
      images: JSON.stringify(["sun1.jpg"]),
    },
    {
      name: "Running Shorts",
      price: 29,
      description: "Lightweight shorts",
      category: "Clothing",
      images: JSON.stringify(["shorts1.jpg"]),
    },
  ];

  await prisma.product.createMany({ data: products });
  console.log("✅ Seeded products!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
