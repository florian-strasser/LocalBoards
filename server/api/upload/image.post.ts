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

        // Find the image file (could be named 'image' or 'file')
        const file = formData.find(f => f.name === 'image' || f.name === 'file');

        if (!file) {
            throw createError({
                statusCode: 400,
                statusMessage: "No image file found in request",
            });
        }

        // Validate it's an image
        if (!file.type.startsWith("image/")) {
            throw createError({
                statusCode: 400,
                statusMessage: "Only image files are allowed",
            });
        }

        // Security: Generate a safe filename
        const fileExt = file.filename.split(".").pop() || "png";
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
        let fileBuffer = file.data;

        // Ensure we have a Buffer
        if (!Buffer.isBuffer(fileBuffer)) {
            fileBuffer = Buffer.from(fileBuffer);
        }

        await fs.writeFile(filePath, fileBuffer);

        // Return the URL where the image can be accessed
        const imageUrl = `/api/uploads/${safeFilename}`;

        return {
            success: true,
            imageUrl: imageUrl,
            filename: file.filename,
            type: file.type,
            size: fileBuffer.length,
        };

    } catch (error) {
        console.error("Image upload error:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Image upload failed",
        });
    }
});
