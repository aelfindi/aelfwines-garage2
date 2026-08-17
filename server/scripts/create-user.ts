import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/db'

async function main() {
  const [, , email, password] = process.argv
  if (!email || !password) {
    console.error('Uso: create-user.ts <email> <password>')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  })
  console.log('OK:', user.id, user.email)
  await prisma.$disconnect()
}

main()
