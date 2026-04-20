import { AthenaClient } from "@aws-sdk/client-athena";

const region = process.env.NEXT_PUBLIC_ATHENA_REGION || "sa-east-1";
const endpoint = process.env.NEXT_PUBLIC_ATHENA_ENDPOINT;

export const athenaClient = new AthenaClient({
  region,
  endpoint: endpoint ? `https://${endpoint}` : undefined,
  credentials: {
    accessKeyId: process.env.SEFAZ_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.SEFAZ_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
