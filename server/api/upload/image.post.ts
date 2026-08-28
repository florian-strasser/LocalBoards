import { defineEventHandler, readMultipartFormData } from "h3";
import { createError } from "h3";
import { join } from "path";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import { getUserSession, getApiKeyUser } from "../../utils/auth";

// Allowed image MIME types and their magic bytes
const ALLOWED_IMAGE_TYPES = {
  "image/png": [0x89, 0x50, 0x4e, 0x47], // PNG magic bytes
  "image/jpeg": [0xff, 0xd8, 0xff], // JPEG magic bytes
  "image/gif": [0x47, 0x49, 0x46, 0x38], // GIF magic bytes
  "image/webp": [0x52, 0x49, 0x46, 0x46], // WebP magic bytes
};

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default defineEventHandler(async (event) => {
  try {
    // CRITICAL FIX: Require authentication - check session first
    const session = await getUserSession(event);
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

    // Find the image file (could be named 'image' or 'file')
    const file = formData.find((f) => f.name === "image" || f.name === "file");

    if (!file) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Validate it's an image MIME type
    if (!file.type || !ALLOWED_IMAGE_TYPES[file.type.toLowerCase()]) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Validate file size
    const fileBuffer = Buffer.isBuffer(file.data)
      ? file.data
      : Buffer.from(file.data);
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Validate magic bytes match MIME type
    const magicBytes = Array.from(fileBuffer.subarray(0, 4));
    const expectedMagicBytes = ALLOWED_IMAGE_TYPES[file.type.toLowerCase()];
    const magicBytesMatch = expectedMagicBytes.every(
      (byte, index) => magicBytes[index] === byte,
    );

    if (!magicBytesMatch) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Security: Use validated file type for extension, not user-provided filename
    const fileExt = file.type.toLowerCase().split("/")[1] || "png";
    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // What the image is for decides whether it is bounded in size. A profile
    // picture is never drawn larger than 144px, so there is no reason to keep
    // the 4000px original of it; anything else keeps its dimensions.
    const purposeField = formData.find((part) => part.name === "purpose");
    const purpose: ImagePurpose =
      purposeField?.data?.toString() === "avatar" ? "avatar" : "content";

    // Stored as WebP whatever arrived. An image the app renders itself is
    // downloaded by everyone who opens the page it is on, and a phone camera's
    // JPEG is an expensive way to draw a 36px avatar.
    const encoded = await toWebp(fileBuffer, { maxWidth: widthFor(purpose) });
    if (!encoded) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    const storedBuffer = encoded.data;
    const safeFilename = `${randomBytes(16).toString("hex")}.webp`;

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      logger.error("Failed to create upload directory:", err);
      throw createError({
        statusCode: 500,
        statusMessage: "Upload failed",
      });
    }

    // Save the file
    const filePath = join(uploadDir, safeFilename);

    await fs.writeFile(filePath, storedBuffer);

    // Return the URL where the image can be accessed
    const imageUrl = `/api/uploads/${safeFilename}`;

    return {
      success: true,
      imageUrl: imageUrl,
      // What was stored, not what arrived — the caller asked for a file and
      // this is the file it got.
      type: "image/webp",
      size: storedBuffer.length,
      width: encoded.width,
      height: encoded.height,
    };
  } catch (error: any) {
    // A refusal already knows what it is — a file that is not an image, or is
    // too big — and saying "Upload failed" with a 500 tells the caller the
    // server broke when it was the file that was wrong. Only something
    // genuinely unexpected becomes a 500.
    if (error?.statusCode) throw error;
    logger.error("Image upload error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Upload failed",
    });
  }
});
