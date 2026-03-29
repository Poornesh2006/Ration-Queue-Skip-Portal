import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { ApiError } from "../utils/apiError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPublicDir = path.resolve(__dirname, "../../../client/public");

const FACE_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.7);

const stripDataUri = (input = "") => input.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

const resolveStoredImageBuffer = async (faceImage) => {
  if (!faceImage) {
    throw new ApiError(404, "No stored face image found for this citizen");
  }

  if (faceImage.startsWith("data:image/")) {
    return Buffer.from(stripDataUri(faceImage), "base64");
  }

  if (faceImage.startsWith("/")) {
    const absolutePath = path.join(clientPublicDir, faceImage.replace(/^\//, ""));
    return fs.readFile(absolutePath);
  }

  return fs.readFile(faceImage);
};

const normalizeInputImage = async (image) => {
  if (!image) {
    throw new ApiError(400, "Face image is required");
  }

  if (image.startsWith("data:image/")) {
    return Buffer.from(stripDataUri(image), "base64");
  }

  return Buffer.from(image, "base64");
};

const digestChunks = (buffer) => {
  const chunkSize = Math.max(32, Math.floor(buffer.length / 32));
  const digests = [];

  for (let index = 0; index < buffer.length; index += chunkSize) {
    const chunk = buffer.subarray(index, Math.min(index + chunkSize, buffer.length));
    const digest = crypto.createHash("sha256").update(chunk).digest();
    digests.push([...digest]);
  }

  return digests;
};

const compareDigests = (leftBuffer, rightBuffer) => {
  const leftDigests = digestChunks(leftBuffer);
  const rightDigests = digestChunks(rightBuffer);
  const size = Math.min(leftDigests.length, rightDigests.length);

  if (!size) {
    return 0;
  }

  let similarityTotal = 0;

  for (let index = 0; index < size; index += 1) {
    const left = leftDigests[index];
    const right = rightDigests[index];
    const perDigest =
      left.reduce((score, value, offset) => score + (255 - Math.abs(value - right[offset])) / 255, 0) /
      left.length;

    similarityTotal += perDigest;
  }

  return Number((similarityTotal / size).toFixed(2));
};

export const verifyFaceMatch = async ({ uploadedImage, storedImage }) => {
  if (process.env.FACE_VERIFICATION_ENABLED !== "true") {
    return {
      enabled: false,
      match: true,
      score: 1,
      threshold: FACE_THRESHOLD,
      message: "Face verification is disabled in this environment",
    };
  }

  const [incomingBuffer, storedBuffer] = await Promise.all([
    normalizeInputImage(uploadedImage),
    resolveStoredImageBuffer(storedImage),
  ]);

  const score = compareDigests(incomingBuffer, storedBuffer);

  return {
    enabled: true,
    match: score >= FACE_THRESHOLD,
    score,
    threshold: FACE_THRESHOLD,
    message:
      score >= FACE_THRESHOLD
        ? "Face verification passed"
        : "Face verification did not meet the configured threshold",
  };
};
