import { defineEventHandler, readMultipartFormData } from "h3";
import { createError } from "h3";
import { join } from "path";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";

export default defineEventHandler(async (event) => {
  try {
    // Ensure this is a multipart form request
    const contentType = event.node.req.headers["content-type"];
    if (!contentType || !contentType.includes("multipart/form-data")) {
      throw createError({
        statusCode: 400,
        statusMessage: "Expected multipart/form-data",
      });
    }

    // Parse the multipart form data
    const formData = await readMultipartFormData(event);

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No files uploaded",
      });
    }

    const file = formData[0];

    if (!file) {
      throw createError({
        statusCode: 400,
        statusMessage: "No file found in request",
      });
    }

    // Validate file
    if (!file.filename) {
      throw createError({
        statusCode: 400,
        statusMessage: "Filename is required",
      });
    }

    // Security: Validate allowed file types
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/zip",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw createError({
        statusCode: 400,
        statusMessage: "File type not allowed",
      });
    }

    // Security: Generate a safe filename
    const fileExt = file.filename.split(".").pop();
    const safeFilename = `${randomBytes(16).toString("hex")}.${fileExt}`;

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create upload directory:", err);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to create upload directory",
      });
    }

    // Save the file
    const filePath = join(uploadDir, safeFilename);
    await fs.writeFile(filePath, file.data);

    // Return the URL where the file can be accessed
    // Use the API endpoint for proper file serving
    const fileUrl = `/api/uploads/${safeFilename}`;

    return {
      success: true,
      url: fileUrl,
      filename: file.filename,
      type: file.type,
      size: file.data.length,
    };
  } catch (error) {
    console.error("File upload error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "File upload failed",
    });
  }
});
