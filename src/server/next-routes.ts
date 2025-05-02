/**
 * Example Next.js API route handlers for secure server-side upload operations.
 *
 * This file provides templates that can be used in Next.js applications
 * to create secure API routes for handling uploads.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generatePresignedUrl,
  completeUpload,
  getFileAccessUrl,
} from "./api-handlers";
import { S3Config } from "../core/types";

/**
 * Configuration from environment variables
 * This pattern keeps credentials on the server side
 */
const s3Config: S3Config = {
  region: process.env.UPLOAD_IT_S3_REGION || "",
  bucket: process.env.UPLOAD_IT_S3_BUCKET || "",
  credentials: {
    accessKeyId: process.env.UPLOAD_IT_S3_ACCESS_KEY || "",
    secretAccessKey: process.env.UPLOAD_IT_S3_SECRET_KEY || "",
  },
  uploadFolder: process.env.UPLOAD_IT_S3_FOLDER,
};

/**
 * POST /api/upload/presigned
 *
 * Generates a presigned URL for client-side uploads to S3
 */
export async function presignedUrlRoute(request: NextRequest) {
  try {
    // You can add authentication here
    // const session = await getSession();
    // if (!session) return new Response('Unauthorized', { status: 401 });

    // Parse request body
    const body = await request.json();
    const { fileName, contentType, folder } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 },
      );
    }

    // Generate presigned URL
    const result = await generatePresignedUrl(
      {
        name: fileName,
        type: contentType,
        size: 0, // Size is not needed for generating URLs
        folder,
      },
      s3Config,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/upload/complete
 *
 * Completes the upload process by recording file metadata
 */
export async function completeUploadRoute(request: NextRequest) {
  try {
    // You can add authentication here
    // const session = await getSession();
    // if (!session) return new Response('Unauthorized', { status: 401 });

    // Parse request body
    const body = await request.json();
    const { fileKey, fileName, contentType, size, lastModified, folder } = body;

    if (!fileKey || !fileName || !contentType || !size) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Complete the upload
    const result = await completeUpload(
      {
        fileKey,
        name: fileName,
        type: contentType,
        size,
        lastModified,
        folder,
      },
      s3Config,
    );

    // Here you would typically save the file metadata to your database
    // await db.files.create({ data: { ...result, userId: session.userId } });

    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/upload/url/:fileKey
 *
 * Refreshes the access URL for a file
 */
export async function getFileUrlRoute(request: NextRequest) {
  try {
    // You can add authentication here
    // const session = await getSession();
    // if (!session) return new Response('Unauthorized', { status: 401 });

    // Get the file key from the URL
    const url = new URL(request.url);
    const fileKey = url.pathname.split("/").pop();

    if (!fileKey) {
      return NextResponse.json(
        { error: "File key is required" },
        { status: 400 },
      );
    }

    // Here you would typically check if the user has access to the file
    // const file = await db.files.findUnique({ where: { key: fileKey } });
    // if (!file || file.userId !== session.userId) {
    //   return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // }

    // Generate a fresh URL
    const accessUrl = await getFileAccessUrl(fileKey, s3Config);

    return NextResponse.json({ url: accessUrl });
  } catch (error) {
    console.error("Error getting file URL:", error);
    return NextResponse.json(
      { error: "Failed to get file URL" },
      { status: 500 },
    );
  }
}

/**
 * Example of how to define these routes in a Next.js App Router
 */
export const appRouterExampleComment = `
// app/api/upload/presigned/route.ts
import { presignedUrlRoute } from 'upload-it/server';
export { presignedUrlRoute as POST };

// app/api/upload/complete/route.ts
import { completeUploadRoute } from 'upload-it/server';
export { completeUploadRoute as POST };

// app/api/upload/url/[fileKey]/route.ts
import { getFileUrlRoute } from 'upload-it/server';
export { getFileUrlRoute as GET };
`;
