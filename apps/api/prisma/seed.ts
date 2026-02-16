import { PrismaClient, Role, AccountType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();
process.env.TZ = 'Asia/Karachi';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/pump_db?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function ensureUser(username: string, password: string, role: Role) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return;
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      password: hashed,
      role,
    },
  });
}

async function ensureAccount(code: string, name: string, type: AccountType) {
  const existing = await prisma.account.findUnique({ where: { code } });
  if (existing) return;
  await prisma.account.create({
    data: {
      code,
      name,
      type,
      balance: 0,
    },
  });
}

async function main() {
  // Users requested (username field is used as email/identifier).
  await ensureUser('admin@gmail.com', 'admin123', Role.ADMIN);
  await ensureUser('manager@gmail.com', 'manager123', Role.MANAGER);
  await ensureUser('operator@gmail.com', 'operator123', Role.OPERATOR);

  // Minimal chart of accounts used by existing report logic.
  await ensureAccount('10101', 'Cash', AccountType.ASSET);
  await ensureAccount('10301', 'Accounts Receivable', AccountType.ASSET);
  await ensureAccount('40101', 'Fuel Sales', AccountType.INCOME);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
