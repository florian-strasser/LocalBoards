import { defineEventHandler, readMultipartFormData } from "h3";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

export default defineEventHandler(async (event) => {
  // Check if the request method is POST
  if (event.req.method !== "POST") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    // Parse the multipart form data
    const formData = await readMultipartFormData(event);

    if (!formData) {
      event.res.statusCode = 400;
      return { error: "No form data received" };
    }

    // Find the image file in the form data
    const imageFile = formData.find((field) => field.name === "image");

    if (!imageFile || !imageFile.data) {
      event.res.statusCode = 400;
      return { error: "No image file provided" };
    }

    // Validate that it's an image
    if (!imageFile.type?.startsWith("image/")) {
      event.res.statusCode = 400;
      return { error: "File is not an image" };
    }

    // Generate a unique filename
    const fileExtension = imageFile.filename?.split(".").pop() || "jpg";
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;

    // Define the upload directory path
    const uploadDir = join(process.cwd(), "public", "uploads");

    // Write the file to the uploads directory
    const filePath = join(uploadDir, uniqueFilename);
    await writeFile(filePath, imageFile.data);

    // Return the relative path to the uploaded image
    const relativePath = `/uploads/${uniqueFilename}`;

    return {
      success: true,
      imageUrl: relativePath,
      message: "Image uploaded successfully",
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    event.res.statusCode = 500;
    return { error: "Internal server error" };
  }
});
