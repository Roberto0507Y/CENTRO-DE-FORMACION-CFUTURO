"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getS3Config = getS3Config;
exports.getS3Client = getS3Client;
const client_s3_1 = require("@aws-sdk/client-s3");
const env_1 = require("./env");
const httpErrors_1 = require("../common/errors/httpErrors");
let client = null;
function getS3Config() {
    const region = env_1.env.AWS_REGION;
    const bucket = env_1.env.AWS_S3_BUCKET;
    const accessKeyId = env_1.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = env_1.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
        throw (0, httpErrors_1.serviceUnavailable)("Uploads no disponibles: configura AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y AWS_S3_BUCKET o AWS_BUCKET_NAME.");
    }
    const baseUrl = env_1.env.AWS_S3_BASE_URL?.replace(/\/+$/, "") ||
        `https://${bucket}.s3.${region}.amazonaws.com`;
    return { region, bucket, baseUrl };
}
function getS3Client() {
    if (client)
        return client;
    const cfg = getS3Config();
    client = new client_s3_1.S3Client({
        region: cfg.region,
        credentials: {
            accessKeyId: env_1.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env_1.env.AWS_SECRET_ACCESS_KEY,
        },
    });
    return client;
}
