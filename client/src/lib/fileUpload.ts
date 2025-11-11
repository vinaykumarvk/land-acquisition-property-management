export interface UploadedFile {
  path: string;
  originalName: string;
  size: number;
  mimeType: string;
  hash: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  metadataSource?: "exif" | null;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "File upload failed");
  }

  return response.json();
}
