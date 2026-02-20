import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EpubReader } from "@/components/reader/epub-reader";
import { logger } from "@/lib/logger";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 1. Fetch book + joined upload path (user_id filter enforces ownership)
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*, book_uploads(storage_path)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    logger.warn("read_page_book_not_found", { userId: user.id, bookId: id });
    redirect("/library");
  }

  // 2. Resolve storage path
  // Supabase types don't fully infer nested join shapes without codegen, so we
  // narrow via an intermediate unknown cast rather than @ts-ignore.
  const bookWithJoin = book as unknown as {
    title: string;
    last_read_location?: string;
    book_uploads?: { storage_path: string } | null;
  };
  const uploadPath = bookWithJoin.book_uploads?.storage_path;

  if (!uploadPath) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Book file not found.</p>
      </div>
    );
  }

  // 3. Create a 24-hour signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("epubs")
    .createSignedUrl(uploadPath, 60 * 60 * 24);

  if (signedUrlError || !signedUrlData) {
    logger.error("read_page_signed_url_failed", { userId: user.id, bookId: id, message: signedUrlError?.message });
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground text-sm">Failed to load book. Please try again.</p>
      </div>
    );
  }

  // 4. Resume location
  const initialLocation = bookWithJoin.last_read_location;

  return (
    <EpubReader
      url={signedUrlData.signedUrl}
      bookId={id}
      bookTitle={bookWithJoin.title}
      initialLocation={initialLocation}
    />
  );
}
