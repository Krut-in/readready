import { NextResponse } from "next/server";

import { AppError, toApiError } from "@/lib/errors";
import {
  EPUB_BUCKET,
  buildStorageObjectPath,
  buildStoredPath,
  validateUploadFormData,
} from "@/lib/uploads/epub-upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new AppError("unauthorized", "Please sign in before uploading files.", 401);
    }

    const formData = await request.formData();
    const validated = validateUploadFormData(formData);

    if (!validated.ok) {
      throw new AppError(validated.code, validated.message, 400);
    }

    const file = validated.file;
    const objectPath = buildStorageObjectPath(user.id);

    const { error: storageError } = await supabase.storage.from(EPUB_BUCKET).upload(objectPath, file, {
      contentType: file.type || "application/epub+zip",
      upsert: false,
    });

    if (storageError) {
      throw new AppError("upload_failed", "Upload failed. Please retry.", 500);
    }

    const storedPath = buildStoredPath(objectPath);

    const { error: insertError } = await supabase.from("book_uploads").insert({
      user_id: user.id,
      storage_path: storedPath,
      original_name: file.name,
      size_bytes: file.size,
      mime_type: file.type || "application/epub+zip",
    });

    if (insertError) {
      await supabase.storage.from(EPUB_BUCKET).remove([objectPath]);
      throw new AppError("metadata_save_failed", "File uploaded, but metadata save failed. Please retry.", 500);
    }

    return NextResponse.json({
      ok: true,
      path: storedPath,
      size: file.size,
      contentType: file.type || "application/epub+zip",
    });
  } catch (error) {
    const handled = toApiError(error);
    return NextResponse.json(handled.payload, { status: handled.status });
  }
}
