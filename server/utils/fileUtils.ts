export function getFileExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
        // Images
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml",

        // Documents
        "pdf": "application/pdf",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls": "application/vnd.ms-excel",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt": "application/vnd.ms-powerpoint",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "csv": "text/csv",

        // Archives
        "zip": "application/zip",
        "rar": "application/x-rar-compressed",
        "tar": "application/x-tar",
        "gz": "application/gzip",

        // Text
        "txt": "text/plain",
        "html": "text/html",
        "htm": "text/html",
        "css": "text/css",
        "js": "text/javascript",
        "json": "application/json",

        // Other
        "mp4": "video/mp4",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
    };

    return mimeTypes[extension] || "application/octet-stream";
}
