/**
 * Extracts alpha channel by comparing an image on white vs black background.
 * Port of the sharp-based algorithm to Canvas API.
 */
export function extractAlphaTwoPass(
  whiteImageData: ImageData,
  blackImageData: ImageData
): ImageData {
  const { width, height } = whiteImageData;
  const dataWhite = whiteImageData.data;
  const dataBlack = blackImageData.data;

  if (dataWhite.length !== dataBlack.length) {
    throw new Error("Dimension mismatch: Images must be identical size");
  }

  const output = new ImageData(width, height);
  const out = output.data;

  // Distance between White (255,255,255) and Black (0,0,0)
  const bgDist = Math.sqrt(3 * 255 * 255); // ≈ 441.67

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;

    const rW = dataWhite[offset];
    const gW = dataWhite[offset + 1];
    const bW = dataWhite[offset + 2];

    const rB = dataBlack[offset];
    const gB = dataBlack[offset + 1];
    const bB = dataBlack[offset + 2];

    const pixelDist = Math.sqrt(
      (rW - rB) ** 2 + (gW - gB) ** 2 + (bW - bB) ** 2
    );

    let alpha = 1 - pixelDist / bgDist;
    alpha = Math.max(0, Math.min(1, alpha));

    let rOut = 0, gOut = 0, bOut = 0;

    if (alpha > 0.01) {
      rOut = rB / alpha;
      gOut = gB / alpha;
      bOut = bB / alpha;
    }

    out[offset] = Math.round(Math.min(255, rOut));
    out[offset + 1] = Math.round(Math.min(255, gOut));
    out[offset + 2] = Math.round(Math.min(255, bOut));
    out[offset + 3] = Math.round(alpha * 255);
  }

  return output;
}

export function loadImageData(file: File): Promise<{ data: ImageData; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height);
      URL.revokeObjectURL(url);
      resolve({ data, img });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export function imageDataToPngBlob(imageData: ImageData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create blob"));
    }, "image/png");
  });
}
