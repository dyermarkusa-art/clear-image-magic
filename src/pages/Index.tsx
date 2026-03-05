import { useState, useCallback } from "react";
import { ImageDropZone } from "@/components/ImageDropZone";
import { extractAlphaTwoPass, loadImageData, imageDataToPngBlob } from "@/lib/extractAlpha";
import { Button } from "@/components/ui/button";
import { Download, Wand2, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [whiteFile, setWhiteFile] = useState<File | null>(null);
  const [blackFile, setBlackFile] = useState<File | null>(null);
  const [whitePreview, setWhitePreview] = useState<string | null>(null);
  const [blackPreview, setBlackPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          </div>
          {(whiteFile || blackFile || resultUrl) && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Reset
            </Button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Description */}
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Remove backgrounds with precision</h2>
            <p className="text-muted-foreground text-sm">
              Upload the same image on a white background and a black background. 
              The algorithm compares them to perfectly extract transparency.
            </p>
          </div>

          {/* Drop zones */}
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
