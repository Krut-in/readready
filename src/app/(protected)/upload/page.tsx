import { EpubUploadForm } from "@/components/upload/epub-upload-form";

export default function UploadPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">EPUB Upload</h1>
      <p className="text-sm text-muted-foreground">
        Upload EPUB files to Supabase Storage. Validation runs in both browser and server routes.
      </p>
      <EpubUploadForm />
    </section>
  );
}
