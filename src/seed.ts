import { prisma } from "./prisma";

async function main() {
  // Clear old data
  await prisma.product.deleteMany();

  const products = [
    {
      name: "Donibot",
      price: 5000,
      description: "Delivery robot",
      category: "Delivery robots",
      images: JSON.stringify(["donibot.jpg"]),
      stock: 5
    },
    {
      name: "Donibot Pro",
      price: 7000,
      description: "Advanced delivery robot",
      category: "Delivery robots",
      images: JSON.stringify(["donibot-pro.jpg"]),
      stock: 3
    },
    {
      name: "Donibot Plus",
      price: 7500,
      description: "Premium delivery robot",
      category: "Delivery robots",
      images: JSON.stringify(["donibot-plus.jpg"]),
      stock: 2
    },
    {
      name: "Carrycot",
      price: 3000,
      description: "Robot carrycot",
      category: "Delivery robots",
      images: JSON.stringify(["/Users/chandrikakarri/code/Botify-Shop-be/uploads/1774349728523-botify_logo.jpeg"]),
      stock: 4
    },
    {
      name: "Greetings Bot Mini",
      price: 2000,
      description: "Mini greeting robot",
      category: "Greeting robots",
      images: JSON.stringify(["greet-mini.jpg"]),
      stock: 4
    },
    {
      name: "Greeting Bot Nova",
      price: 2500,
      description: "Nova greeting robot",
      category: "Greeting robots",
      images: JSON.stringify(["greet-nova.jpg"]),
      stock: 3
    },
    {
      name: "Clean Bot",
      price: 3500,
      description: "Cleaning robot",
      category: "Cleaning robots",
      images: JSON.stringify(["clean-bot.jpg"]),
      stock: 2
    },
    {
      name: "Clean Bot A",
      price: 3600,
      description: "Cleaning robot A",
      category: "Cleaning robots",
      images: JSON.stringify(["clean-bot-a.jpg"]),
      stock: 2
    },
    {
      name: "Clean Bot B",
      price: 3700,
      description: "Cleaning robot B",
      category: "Cleaning robots",
      images: JSON.stringify(["clean-bot-b.jpg"]),
      stock: 1
    }
  ];

  await prisma.product.createMany({ data: products });
  console.log("✅ Seeded robot products!");
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
