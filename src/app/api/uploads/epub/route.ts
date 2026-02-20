import { NextResponse } from "next/server";

import { AppError, toApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  EPUB_BUCKET,
  buildStorageObjectPath,
  buildStoredPath,
  validateUploadFormData,
} from "@/lib/uploads/epub-upload";
import { buildGoodreadsSearchUrl } from "@/lib/library/goodreads-link";
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
    const bookIdToLink = formData.get("bookId") as string | null;
    const validated = validateUploadFormData(formData);

    if (!validated.ok) {
      throw new AppError(validated.code, validated.message, 400);
    }

    const file = validated.file;
    const objectPath = buildStorageObjectPath(user.id);
    const EPUB_MIME = "application/epub+zip";

    const { error: storageError } = await supabase.storage.from(EPUB_BUCKET).upload(objectPath, file, {
      contentType: EPUB_MIME,
      upsert: false,
    });

    if (storageError) {
      logger.error("epub_upload_storage_failed", {
        userId: user.id,
        code: storageError.message,
      });
      throw new AppError("upload_failed", "Upload failed. Please retry.", 500);
    }

    const storedPath = buildStoredPath(objectPath);

    // Insert book_uploads metadata row and retrieve the generated ID
    const { data: uploadRow, error: insertError } = await supabase
      .from("book_uploads")
      .insert({
        user_id: user.id,
        storage_path: storedPath,
        original_name: file.name,
        size_bytes: file.size,
        mime_type: EPUB_MIME,
      })
      .select("id")
      .single();

    if (insertError || !uploadRow) {
      logger.error("epub_upload_metadata_failed", {
        userId: user.id,
        code: insertError?.message,
      });
      await supabase.storage.from(EPUB_BUCKET).remove([objectPath]);
      throw new AppError("metadata_save_failed", "File uploaded, but metadata save failed. Please retry.", 500);
    }

    // If a bookId was provided, link the upload to it instead of creating a new book
    if (bookIdToLink) {
      const { data: existingBook, error: checkError } = await supabase
        .from("books")
        .select("id")
        .eq("id", bookIdToLink)
        .eq("user_id", user.id)
        .single();

      if (!checkError && existingBook) {
        const { error: linkError } = await supabase
          .from("books")
          .update({ upload_id: uploadRow.id })
          .eq("id", bookIdToLink)
          .eq("user_id", user.id);

        if (linkError) {
          logger.warn("epub_upload_existing_book_link_failed", {
            userId: user.id,
            uploadId: uploadRow.id,
            bookId: bookIdToLink,
            code: linkError.message,
          });
        }

        logger.info("epub_uploaded_and_linked", {
          userId: user.id,
          sizeBytes: file.size,
          uploadId: uploadRow.id,
          bookId: bookIdToLink,
        });

        return NextResponse.json({
          ok: true,
          path: storedPath,
          size: file.size,
          contentType: EPUB_MIME,
          uploadId: uploadRow.id,
          bookId: bookIdToLink,
        });
      }
    }

    // Auto-create a books entry linked to this upload so the reader can find it.
    // Derive a title from the original filename (strip .epub extension).
    const derivedTitle = file.name.replace(/\.epub$/i, "").replace(/[_-]/g, " ").trim() || "Untitled";
    const goodreadsUrl = buildGoodreadsSearchUrl(derivedTitle);

    const { data: newBook, error: bookError } = await supabase
      .from("books")
      .insert({
        user_id: user.id,
        title: derivedTitle,
        state: "reading",
        upload_id: uploadRow.id,
        goodreads_search_url: goodreadsUrl,
      })
      .select("id")
      .single();

    if (bookError) {
      // Non-fatal: the upload succeeded; user can manually link via library.
      logger.warn("epub_upload_book_link_failed", {
        userId: user.id,
        uploadId: uploadRow.id,
        code: bookError.message,
      });
    }

    logger.info("epub_uploaded", {
      userId: user.id,
      sizeBytes: file.size,
      uploadId: uploadRow.id,
      bookId: newBook?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      path: storedPath,
      size: file.size,
      contentType: EPUB_MIME,
      uploadId: uploadRow.id,
      bookId: newBook?.id ?? null,
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      logger.error("epub_upload_unexpected", { message: String(error) });
    }
    const handled = toApiError(error);
    return NextResponse.json(handled.payload, { status: handled.status });
  }
}
