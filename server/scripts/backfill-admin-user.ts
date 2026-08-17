import 'dotenv/config'
import { prisma } from '../src/db'

// One-off: creates the admin's User row (reusing the existing bcrypt hash - no password
// re-entry needed) and rewrites every legacy `userId = 'admin'` row to the new UUID.
// Run once, inside a maintenance window, with the app stopped (see DEPLOY.md).
async function main() {
  const email = process.env.ADMIN_EMAIL
  const passwordHash = process.env.ADMIN_PASSWORD_HASH
  if (!email || !passwordHash) {
    console.error('ADMIN_EMAIL / ADMIN_PASSWORD_HASH must be set in server/.env')
    process.exit(1)
  }

  const admin = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: {},
  })
  console.log('Admin user id:', admin.id)

  const results = await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { userId: 'admin' }, data: { userId: admin.id } }),
    prisma.maintenanceLog.updateMany({ where: { userId: 'admin' }, data: { userId: admin.id } }),
    prisma.motoSettings.updateMany({ where: { userId: 'admin' }, data: { userId: admin.id } }),
    prisma.motoSettingsHistory.updateMany({ where: { userId: 'admin' }, data: { userId: admin.id } }),
    prisma.sessionNote.updateMany({ where: { userId: 'admin' }, data: { userId: admin.id } }),
    prisma.vehicleDocument.updateMany({ where: { userId: 'admin' }, data: { userId: admin.id } }),
  ])

  const tables = ['vehicles', 'maintenance_logs', 'moto_settings', 'moto_settings_history', 'session_notes', 'vehicle_documents']
  console.log('Filas migradas por tabla:', tables.map((t, i) => `${t}=${results[i].count}`).join(', '))

  await prisma.$disconnect()
}

main()
