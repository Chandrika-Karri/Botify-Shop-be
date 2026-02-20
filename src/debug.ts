import { prisma } from "./prisma";

async function main() {
  const products = await prisma.product.findMany();
  console.log("Products in DB:", products);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
