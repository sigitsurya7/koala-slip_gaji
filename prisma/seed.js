const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: "admin", password: "admin123", role: "Admin" },
    { username: "member", password: "member123", role: "Member" },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { password: hashed, role: u.role },
      create: { username: u.username, password: hashed, role: u.role },
    });
  }

  console.log("Seed completed: users created/updated");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

