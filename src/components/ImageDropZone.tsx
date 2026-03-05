import { useCallback, useState } from "react";
import { Upload } from "lucide-react";

interface ImageDropZoneProps {
  label: string;
  bgColor: "black" | "white";
  file: File | null;
  onFile: (file: File) => void;
  previewUrl: string | null;
}

export function ImageDropZone({ label, bgColor, file, onFile, previewUrl }: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onFile(f);
  }, [onFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  const borderStyle = bgColor === "black"
    ? "border-foreground/20"
    : "border-foreground/20";

  return (
    <label
      className={`
        relative flex flex-col items-center justify-center
        rounded-xl border-2 border-dashed cursor-pointer
        transition-all duration-200 overflow-hidden
        min-h-[220px] aspect-square max-h-[320px]
        ${isDragging ? "border-primary bg-[hsl(var(--drop-zone))] scale-[1.02]" : borderStyle + " hover:border-primary/50"}
        ${previewUrl ? "p-0" : "p-6"}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
      {previewUrl ? (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ backgroundColor: bgColor }}
        >
          <img src={previewUrl} alt={label} className="max-w-full max-h-full object-contain" />
        </div>
      ) : (
        <>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: bgColor, border: `2px solid ${bgColor === "black" ? "#333" : "#ddd"}` }}
          >
            <Upload className="w-6 h-6" style={{ color: bgColor === "black" ? "#fff" : "#000" }} />
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground mt-1">Drop or click to upload</span>
        </>
      )}
    </label>
  );
}
