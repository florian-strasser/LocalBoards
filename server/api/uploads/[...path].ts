import { defineEventHandler, getRouterParams } from "h3";
import { createError } from "h3";
import { join, resolve, normalize } from "path";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import { getFileExtension, getMimeType } from "../../utils/fileUtils";

export default defineEventHandler(async (event) => {
  try {
    // Get the file path from the URL
    const { path } = getRouterParams(event);
    if (!path) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Security: Prevent directory traversal using path.normalize and resolve
    const normalizedPath = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "");
    const uploadDir = join(process.cwd(), "public", "uploads");
    const fullPath = resolve(uploadDir, normalizedPath);

    // Verify the resolved path is within the uploads directory
    if (!fullPath.startsWith(resolve(uploadDir))) {
      throw createError({
        statusCode: 403,
        statusMessage: "Invalid request",
      });
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      throw createError({
        statusCode: 404,
        statusMessage: "Resource not found",
      });
    }

    // Get file stats
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request",
      });
    }

    // Determine content type
    const ext = getFileExtension(fullPath);
    const contentType = getMimeType(ext) || "application/octet-stream";

    // Set proper headers for file download
    event.node.res.setHeader("Content-Type", contentType);
    event.node.res.setHeader("Content-Length", stats.size);
    // MEDIUM FIX: Don't expose original filename, use safe basename
    const safeBasename = fullPath.split("\/").pop()?.split("\\").pop();
    event.node.res.setHeader(
      "Content-Disposition",
      `inline; filename="${safeBasename || "file"}"`,
    );
    event.node.res.setHeader("Cache-Control", "public, max-age=31536000");

    // Stream the file
    return createReadStream(fullPath);
  } catch (error) {
    logger.error("File download error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Download failed",
    });
  }
});
