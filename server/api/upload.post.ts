import { defineEventHandler, readMultipartFormData } from "h3";
import { createError } from "h3";
import { join } from "path";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import { getSession, getApiKeyUser } from "../utils/auth";

// Allowed file types with their MIME types and magic bytes signatures
const ALLOWED_FILE_TYPES = {
  // PDF
  "application/pdf": { extensions: ["pdf"], magic: [0x25, 0x50, 0x44, 0x46] },
  // Word
  "application/msword": {
    extensions: ["doc"],
    magic: [0xd0, 0xcf, 0x11, 0xe0],
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: ["docx"],
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  // Excel
  "application/vnd.ms-excel": {
    extensions: ["xls"],
    magic: [0xd0, 0xcf, 0x11, 0xe0],
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    extensions: ["xlsx"],
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  // CSV (check for text content)
  "text/csv": { extensions: ["csv"], magic: null },
  // PowerPoint
  "application/vnd.ms-powerpoint": {
    extensions: ["ppt"],
    magic: [0xd0, 0xcf, 0x11, 0xe0],
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    extensions: ["pptx"],
    magic: [0x50, 0x4b, 0x03, 0x04],
  },
  // Images
  "image/jpeg": { extensions: ["jpg", "jpeg"], magic: [0xff, 0xd8, 0xff] },
  "image/png": { extensions: ["png"], magic: [0x89, 0x50, 0x4e, 0x47] },
  // ZIP
  "application/zip": { extensions: ["zip"], magic: [0x50, 0x4b, 0x03, 0x04] },
};

// Max file size: 50MB for general uploads
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default defineEventHandler(async (event) => {
  try {
    // CRITICAL FIX: Require authentication - check session first
    const session = await getSession(event);
    const apiKeyUser = await getApiKeyUser(event);

    if (!session && !apiKeyUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Get authenticated user ID
    const userId = session?.user?.id || apiKeyUser?.user?.id;
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    // Ensure this is a multipart form request
    const contentType = event.node.req.headers["content-type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Parse the multipart form data
    const formData = await readMultipartFormData(event);

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    const file = formData[0];

    if (!file) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Validate file has data
    if (!file.filename) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Validate it's an allowed MIME type
    const normalizedType = file.type.toLowerCase();
    const fileInfo = ALLOWED_FILE_TYPES[normalizedType];

    if (!fileInfo) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Get file buffer
    const fileBuffer = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data);

    // Validate file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Validate magic bytes for non-CSV files (CSV is text-based and harder to validate)
    if (fileInfo.magic && fileBuffer.length >= fileInfo.magic.length) {
      const magicBytes = Array.from(
        fileBuffer.subarray(0, fileInfo.magic.length),
      );
      const magicBytesMatch = fileInfo.magic.every(
        (byte, index) => magicBytes[index] === byte,
      );

      if (!magicBytesMatch) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid request",
        });
      }
    }

    // Security: Use validated file type for extension, not user-provided filename
    const fileExt = fileInfo.extensions[0];

    const safeFilename = `${randomBytes(16).toString("hex")}.${fileExt}`;

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create upload directory:", err);
      throw createError({
        statusCode: 500,
        statusMessage: "Upload failed",
      });
    }

    // Save the file
    const filePath = join(uploadDir, safeFilename);
    await fs.writeFile(filePath, fileBuffer);

    // Return the URL where the file can be accessed
    const fileUrl = `/api/uploads/${safeFilename}`;

    return {
      success: true,
      url: fileUrl,
      type: file.type,
      size: fileBuffer.length,
    };
  } catch (error) {
    console.error("File upload error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Upload failed",
    });
  }
});
