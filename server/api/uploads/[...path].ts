import { defineEventHandler, getRouterParams } from "h3";
import { createError } from "h3";
import { join } from "path";
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
        statusMessage: "File path is required",
      });
    }

    // Security: Prevent directory traversal
    const safePath = path.replace(/^\/+|\/+$/g, "");
    if (safePath.includes("..") || safePath.includes("//")) {
      throw createError({
        statusCode: 403,
        statusMessage: "Invalid file path",
      });
    }

    // Construct the full file path
    const uploadDir = join(process.cwd(), "public", "uploads");
    const filePath = join(uploadDir, safePath);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      throw createError({
        statusCode: 404,
        statusMessage: "File not found",
      });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw createError({
        statusCode: 400,
        statusMessage: "Path is not a file",
      });
    }

    // Determine content type
    const ext = getFileExtension(filePath);
    const contentType = getMimeType(ext) || "application/octet-stream";

    // Set proper headers for file download
    event.node.res.setHeader("Content-Type", contentType);
    event.node.res.setHeader("Content-Length", stats.size);
    event.node.res.setHeader(
      "Content-Disposition",
      `inline; filename="${safePath.split("/").pop()}"`,
    );
    event.node.res.setHeader("Cache-Control", "public, max-age=31536000");

    // Stream the file
    return createReadStream(filePath);
  } catch (error) {
    console.error("File download error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "File download failed",
    });
  }
});
