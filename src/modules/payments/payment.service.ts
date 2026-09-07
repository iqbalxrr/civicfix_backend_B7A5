import { PaymentStatus, Priority } from "@prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { createAuditLog } from "../../utils/audit";
import { createBkashPayment, executeBkashPayment, queryBkashPayment } from "./bkash.client";

const invoiceNumber = () => `CFX${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const initiatePriorityPayment = async (citizenId: string, complaintId: string) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
  });
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (complaint.citizenId !== citizenId) throw new ApiError(403, "Forbidden");
  if (complaint.priority !== Priority.PRIORITY) {
    throw new ApiError(400, "Only PRIORITY complaints require payment");
  }

  const existingPaid = await prisma.payment.findFirst({
    where: { complaintId, status: PaymentStatus.COMPLETED },
  });
  if (existingPaid) {
    throw new ApiError(409, "Priority fee already paid for this complaint");
  }

  const pending = await prisma.payment.findFirst({
    where: { complaintId, status: PaymentStatus.PENDING },
  });
  if (pending?.bkashPaymentId) {
    // return existing pending session if still usable conceptually
  }

  const amount = env.PRIORITY_FEE_BDT;
  const merchantInvoiceNumber = invoiceNumber();
  const callbackURL = `${env.BASE_URL}/api/v1/payments/callback`;

  const bkash = await createBkashPayment({
    amount,
    merchantInvoiceNumber,
    callbackURL,
    payerReference: citizenId.slice(0, 20),
  });

  const payment = await prisma.payment.create({
    data: {
      complaintId,
      citizenId,
      amount,
      currency: "BDT",
      status: PaymentStatus.PENDING,
      merchantInvoiceNumber,
      bkashPaymentId: bkash.paymentID,
      bkashResponse: bkash as object,
    },
  });

  await createAuditLog({
    actorId: citizenId,
    action: "PAYMENT_INITIATED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { complaintId, amount, bkashPaymentId: bkash.paymentID },
  });

  return {
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    bkashPaymentId: bkash.paymentID,
    bkashURL: bkash.bkashURL,
    merchantInvoiceNumber,
  };
};

export const handleBkashCallback = async (paymentID: string, status?: string) => {
  const payment = await prisma.payment.findFirst({
    where: { bkashPaymentId: paymentID },
    include: { complaint: true },
  });
  if (!payment) throw new ApiError(404, "Payment not found");

  if (payment.status === PaymentStatus.COMPLETED) {
    return { payment, alreadyProcessed: true };
  }

  if (status === "cancel" || status === "failure" || status === "failed") {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status === "cancel" ? PaymentStatus.CANCELLED : PaymentStatus.FAILED,
      },
    });
    return { payment: updated, alreadyProcessed: false };
  }

  let executeResult: Awaited<ReturnType<typeof executeBkashPayment>>;
  try {
    executeResult = await executeBkashPayment(paymentID);
  } catch {
    executeResult = (await queryBkashPayment(paymentID)) as Awaited<
      ReturnType<typeof executeBkashPayment>
    >;
  }

  const success =
    executeResult?.transactionStatus === "Completed" ||
    executeResult?.statusCode === "0000";

  if (!success) {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        bkashResponse: executeResult as object,
      },
    });
    return { payment: updated, alreadyProcessed: false };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        trxId: executeResult.trxID,
        paidAt: new Date(),
        bkashResponse: executeResult as object,
      },
    });

    // Escalate SLA for priority after payment
    const currentDue = payment.complaint.slaDueAt;
    const escalatedDue = new Date(Math.min(currentDue.getTime(), Date.now() + 12 * 60 * 60 * 1000));

    await tx.complaint.update({
      where: { id: payment.complaintId },
      data: {
        priority: Priority.PRIORITY,
        slaDueAt: escalatedDue,
      },
    });

    await tx.complaintUpdate.create({
      data: {
        complaintId: payment.complaintId,
        actorId: payment.citizenId,
        note: `Priority fee paid via bKash. trxID=${executeResult.trxID}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: payment.citizenId,
        action: "PAYMENT_COMPLETED",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { trxId: executeResult.trxID, complaintId: payment.complaintId },
      },
    });

    return updatedPayment;
  });

  return { payment: result, alreadyProcessed: false };
};

export const getPaymentById = async (id: string, userId: string, role: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      complaint: { select: { id: true, trackingId: true, title: true, priority: true } },
    },
  });
  if (!payment) throw new ApiError(404, "Payment not found");
  if (role === "CITIZEN" && payment.citizenId !== userId) {
    throw new ApiError(403, "Forbidden");
  }
  return payment;
};

export const getPaymentsByComplaint = async (
  complaintId: string,
  userId: string,
  role: string,
) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, deletedAt: null },
  });
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (role === "CITIZEN" && complaint.citizenId !== userId) {
    throw new ApiError(403, "Forbidden");
  }

  return prisma.payment.findMany({
    where: { complaintId },
    orderBy: { createdAt: "desc" },
  });
};
