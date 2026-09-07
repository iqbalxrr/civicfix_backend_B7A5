import axios from "axios";
import { env } from "../../config/env";
import { cacheGet, cacheSet } from "../../config/redis";
import { ApiError } from "../../utils/ApiError";

type BkashTokenResponse = {
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
};

type BkashCreatePaymentResponse = {
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  successCallbackURL?: string;
  failureCallbackURL?: string;
  cancelledCallbackURL?: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime: string;
  transactionStatus: string;
  merchantInvoiceNumber: string;
  statusCode?: string;
  statusMessage?: string;
};

type BkashExecuteResponse = {
  paymentID: string;
  trxID?: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  merchantInvoiceNumber: string;
  statusCode?: string;
  statusMessage?: string;
};

const ensureBkashConfig = () => {
  if (!env.BKASH_USERNAME || !env.BKASH_PASSWORD || !env.BKASH_APP_KEY || !env.BKASH_APP_SECRET) {
    throw new ApiError(500, "bKash credentials are not configured");
  }
};

export const getBkashToken = async (): Promise<string> => {
  ensureBkashConfig();
  const cached = await cacheGet<string>("bkash:id_token");
  if (cached) return cached;

  const url = `${env.BKASH_BASE_URL}/tokenized/checkout/token/grant`;
  const { data } = await axios.post<BkashTokenResponse>(
    url,
    {
      app_key: env.BKASH_APP_KEY,
      app_secret: env.BKASH_APP_SECRET,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: env.BKASH_USERNAME!,
        password: env.BKASH_PASSWORD!,
      },
      timeout: 20000,
    },
  );

  if (!data?.id_token) {
    throw new ApiError(502, "Failed to obtain bKash token");
  }

  const ttl = Math.max(60, Number(data.expires_in || 3600) - 60);
  await cacheSet("bkash:id_token", data.id_token, ttl);
  return data.id_token;
};

export const createBkashPayment = async (input: {
  amount: number;
  merchantInvoiceNumber: string;
  callbackURL: string;
  payerReference?: string;
}) => {
  const token = await getBkashToken();
  const url = `${env.BKASH_BASE_URL}/tokenized/checkout/create`;

  const { data } = await axios.post<BkashCreatePaymentResponse>(
    url,
    {
      mode: "0011",
      payerReference: input.payerReference || "CivicFix",
      callbackURL: input.callbackURL,
      amount: input.amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: input.merchantInvoiceNumber,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: token,
        "x-app-key": env.BKASH_APP_KEY!,
      },
      timeout: 20000,
    },
  );

  if (!data?.paymentID || !data?.bkashURL) {
    throw new ApiError(502, data?.statusMessage || "Failed to create bKash payment");
  }

  return data;
};

export const executeBkashPayment = async (paymentID: string) => {
  const token = await getBkashToken();
  const url = `${env.BKASH_BASE_URL}/tokenized/checkout/execute`;

  const { data } = await axios.post<BkashExecuteResponse>(
    url,
    { paymentID },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: token,
        "x-app-key": env.BKASH_APP_KEY!,
      },
      timeout: 20000,
    },
  );

  return data;
};

export const queryBkashPayment = async (paymentID: string) => {
  const token = await getBkashToken();
  const url = `${env.BKASH_BASE_URL}/tokenized/checkout/payment/status`;

  const { data } = await axios.post(
    url,
    { paymentID },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: token,
        "x-app-key": env.BKASH_APP_KEY!,
      },
      timeout: 20000,
    },
  );

  return data;
};
