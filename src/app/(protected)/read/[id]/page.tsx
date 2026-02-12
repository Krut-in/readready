import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EpubReader } from "@/components/reader/epub-reader";
import { AppError } from "@/lib/errors";

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

  // 1. Fetch Book
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*, book_uploads(storage_path)")
    .eq("id", id)
    .single();

  if (bookError || !book) {
    // In a real app, handle error gracefully (e.g., toast or error page)
    console.error("Error fetching book:", bookError);
    redirect("/dashboard");
  }

  // 2. Get Upload Path
  // @ts-ignore - Supabase types might not fully infer the joined table yet without generation
  const uploadPath = book.book_uploads?.storage_path;

  if (!uploadPath) {
    console.error("Book has no associated upload file.");
    // Should probably show an error state
    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Book file not found.</p>
        </div>
    );
  }

  // 3. Create Signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("epubs")
    .createSignedUrl(uploadPath, 60 * 60 * 24); // 24 hours

  if (signedUrlError || !signedUrlData) {
    console.error("Error creating signed URL:", signedUrlError);
    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Failed to load book.</p>
        </div>
    );
  }

  // 4. Initial Location
  // Cast to any because last_read_location is in the pending migration
  const initialLocation = (book as any).last_read_location || undefined;

  return (
    <EpubReader 
      url={signedUrlData.signedUrl} 
      initialLocation={initialLocation}
      bookId={id}
    />
  );
}
