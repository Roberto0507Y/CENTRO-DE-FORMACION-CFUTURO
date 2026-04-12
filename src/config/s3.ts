import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";
import { serviceUnavailable } from "../common/errors/httpErrors";

export type S3Config = {
  region: string;
  bucket: string;
  baseUrl: string;
};

let client: S3Client | null = null;

export function getS3Config(): S3Config {
  const region = env.AWS_REGION;
  const bucket = env.AWS_S3_BUCKET;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw serviceUnavailable(
      "Uploads no disponibles: configura AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_S3_BUCKET o AWS_BUCKET_NAME."
    );
  }

  const baseUrl =
    env.AWS_S3_BASE_URL?.replace(/\/+$/, "") ||
    `https://${bucket}.s3.${region}.amazonaws.com`;

  return { region, bucket, baseUrl };
}

export function getS3Client(): S3Client {
  if (client) return client;
  const cfg = getS3Config();
  client = new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}
