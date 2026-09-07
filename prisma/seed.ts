import bcrypt from "bcryptjs";
import { PrismaClient, Priority, Role, ComplaintStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CivicFix database...");

  await prisma.auditLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.complaintUpdate.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const staffHash = await bcrypt.hash("Staff@12345", 12);
  const citizenHash = await bcrypt.hash("Citizen@12345", 12);

  const publicWorks = await prisma.department.create({
    data: {
      name: "Public Works",
      code: "PWD",
      description: "Roads, drains, and infrastructure",
    },
  });

  const sanitation = await prisma.department.create({
    data: {
      name: "Sanitation",
      code: "SAN",
      description: "Waste collection and cleaning",
    },
  });

  const utilities = await prisma.department.create({
    data: {
      name: "Utilities",
      code: "UTL",
      description: "Street lights, water, and power poles",
    },
  });

  const pothole = await prisma.category.create({
    data: {
      name: "Pothole / Road Damage",
      slug: "pothole-road-damage",
      slaHours: 48,
      departmentId: publicWorks.id,
      description: "Road surface damage and potholes",
    },
  });

  const garbage = await prisma.category.create({
    data: {
      name: "Garbage Collection",
      slug: "garbage-collection",
      slaHours: 24,
      departmentId: sanitation.id,
      description: "Missed or overflowing waste bins",
    },
  });

  await prisma.category.create({
    data: {
      name: "Street Light Outage",
      slug: "street-light-outage",
      slaHours: 36,
      departmentId: utilities.id,
      description: "Non-functional street lights",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "City Admin",
      email: "admin@civicfix.com",
      passwordHash,
      role: Role.ADMIN,
      phone: "01700000001",
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Rahim Staff",
      email: "staff@civicfix.com",
      passwordHash: staffHash,
      role: Role.STAFF,
      phone: "01700000002",
      departmentId: publicWorks.id,
    },
  });

  const citizen = await prisma.user.create({
    data: {
      name: "Karim Citizen",
      email: "citizen@civicfix.com",
      passwordHash: citizenHash,
      role: Role.CITIZEN,
      phone: "01700000003",
      address: "Dhanmondi, Dhaka",
    },
  });

  const slaDueAt = new Date();
  slaDueAt.setHours(slaDueAt.getHours() + 48);

  const complaint = await prisma.complaint.create({
    data: {
      trackingId: "CFX-SEED-0001",
      title: "Large pothole near school gate",
      description:
        "A deep pothole has formed in front of the school gate causing traffic and safety issues for students.",
      location: "Road 7, Dhanmondi, Dhaka",
      latitude: 23.7465,
      longitude: 90.376,
      status: ComplaintStatus.SUBMITTED,
      priority: Priority.STANDARD,
      categoryId: pothole.id,
      departmentId: publicWorks.id,
      citizenId: citizen.id,
      slaDueAt,
    },
  });

  await prisma.complaintUpdate.create({
    data: {
      complaintId: complaint.id,
      actorId: citizen.id,
      toStatus: ComplaintStatus.SUBMITTED,
      note: "Seed complaint submitted",
    },
  });

  await prisma.complaint.create({
    data: {
      trackingId: "CFX-SEED-0002",
      title: "Overflowing garbage bin",
      description: "Community bin has not been emptied for 4 days and is overflowing onto the street.",
      location: "Mirpur 10, Dhaka",
      status: ComplaintStatus.UNDER_REVIEW,
      priority: Priority.PRIORITY,
      categoryId: garbage.id,
      departmentId: sanitation.id,
      citizenId: citizen.id,
      slaDueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED_COMPLETED",
      entityType: "System",
      metadata: {
        admin: admin.email,
        staff: staff.email,
        citizen: citizen.email,
      },
    },
  });

  console.log("Seed completed.");
  console.log("Admin   : admin@civicfix.com / Admin@12345");
  console.log("Staff   : staff@civicfix.com / Staff@12345");
  console.log("Citizen : citizen@civicfix.com / Citizen@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
