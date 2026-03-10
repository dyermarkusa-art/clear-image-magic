import { useState, useCallback } from "react";
import { ImageDropZone } from "@/components/ImageDropZone";
import { extractAlphaTwoPass, loadImageData, imageDataToPngBlob } from "@/lib/extractAlpha";
import { Button } from "@/components/ui/button";
import { Download, Wand2, RotateCcw, AlertCircle, Upload, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const base64ToFile = async (base64: string, filename: string): Promise<File> => {
  const res = await fetch(base64);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/png" });
};

const Index = () => {
  const [whiteFile, setWhiteFile] = useState<File | null>(null);
  const [blackFile, setBlackFile] = useState<File | null>(null);
  const [whitePreview, setWhitePreview] = useState<string | null>(null);
  const [blackPreview, setBlackPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);

  const handleWhiteFile = useCallback((f: File) => {
    setWhiteFile(f);
    setWhitePreview(URL.createObjectURL(f));
    setResultUrl(null);
    setError(null);
  }, []);

  const handleBlackFile = useCallback((f: File) => {
    setBlackFile(f);
    setBlackPreview(URL.createObjectURL(f));
    setResultUrl(null);
    setError(null);
  }, []);

  const handleSourceFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSourceFile(f);
    setSourcePreview(URL.createObjectURL(f));
    setError(null);
  }, []);

  const generateBackgrounds = useCallback(async () => {
    if (!sourceFile) return;
    setAiProcessing(true);
    setError(null);
    try {
      const base64 = await fileToBase64(sourceFile);

      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-backgrounds",
        { body: { imageBase64: base64 } }
      );

      if (fnError) throw new Error(fnError.message || "Failed to generate backgrounds");
      if (data.error) throw new Error(data.error);

      const { whiteImage, blackImage } = data;

      // Convert base64 results to Files and set them
      const [wFile, bFile] = await Promise.all([
        base64ToFile(whiteImage, "white-bg.png"),
        base64ToFile(blackImage, "black-bg.png"),
      ]);

      setWhiteFile(wFile);
      setWhitePreview(whiteImage);
      setBlackFile(bFile);
      setBlackPreview(blackImage);
      setResultUrl(null);

      toast.success("AI generated both backgrounds! Ready to extract transparency.");
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setAiProcessing(false);
    }
  }, [sourceFile]);

  const process = useCallback(async () => {
    if (!whiteFile || !blackFile) return;
    setProcessing(true);
    setError(null);
    try {
      const [white, black] = await Promise.all([
        loadImageData(whiteFile),
        loadImageData(blackFile),
      ]);

      if (white.data.width !== black.data.width || white.data.height !== black.data.height) {
        throw new Error(`Size mismatch: white is ${white.data.width}×${white.data.height}, black is ${black.data.width}×${black.data.height}`);
      }

      const result = extractAlphaTwoPass(white.data, black.data);
      const blob = await imageDataToPngBlob(result);
      setResultUrl(URL.createObjectURL(blob));
      toast.success("Background removed successfully!");
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  }, [whiteFile, blackFile]);

  const download = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "transparent.png";
    a.click();
  }, [resultUrl]);

  const reset = useCallback(() => {
    setWhiteFile(null);
    setBlackFile(null);
    setWhitePreview(null);
    setBlackPreview(null);
    setResultUrl(null);
    setError(null);
    setSourceFile(null);
    setSourcePreview(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Alpha Extract</h1>
            <h1 className="text-lg font-bold tracking-tight">Alpha Extract</h1>
          </div>
          {(whiteFile || blackFile || resultUrl || sourceFile) && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Description */}
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Remove backgrounds with precision</h2>
            <p className="text-muted-foreground text-sm">
              Upload the same image on a white background and a black background,
              or let AI generate both versions from a single photo.
            </p>
          </div>

          {/* AI Upload Section */}
          <div className="border rounded-xl p-6 max-w-xl mx-auto space-y-4 bg-card">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-sm">AI-Powered — Upload a single image</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a photo of a person and AI will generate the white and black background versions automatically.
            </p>

            {sourcePreview ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border max-w-[200px] mx-auto">
                  <img src={sourcePreview} alt="Source" className="w-full" />
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={generateBackgrounds}
                    disabled={aiProcessing}
                    size="default"
                  >
                    {aiProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Backgrounds
                      </>
                    )}
                  </Button>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="default" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Change Image
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSourceFile}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Drop or click to upload a photo</span>
                <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSourceFile}
                />
              </label>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 max-w-xl mx-auto">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">OR upload manually</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Manual Drop zones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
            <ImageDropZone
              label="White Background"
              bgColor="white"
              file={whiteFile}
              onFile={handleWhiteFile}
              previewUrl={whitePreview}
            />
            <ImageDropZone
              label="Black Background"
              bgColor="black"
              file={blackFile}
              onFile={handleBlackFile}
              previewUrl={blackPreview}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Process button */}
          {whiteFile && blackFile && !resultUrl && (
            <div className="flex justify-center">
              <Button size="lg" onClick={process} disabled={processing}>
                <Wand2 className="w-4 h-4 mr-2" />
                {processing ? "Processing…" : "Extract Transparency"}
              </Button>
            </div>
          )}

          {/* Result */}
          {resultUrl && (
            <div className="space-y-4">
              <h3 className="text-center text-sm font-medium text-muted-foreground">Result</h3>
              <div className="checkerboard rounded-xl overflow-hidden border max-w-md mx-auto">
                <img src={resultUrl} alt="Result with transparency" className="w-full" />
              </div>
              <div className="flex justify-center">
                <Button onClick={download} variant="default" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Save as PNG
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
