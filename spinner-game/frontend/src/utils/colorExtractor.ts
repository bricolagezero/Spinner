export async function extractColorsFromImage(imageUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Scale down for performance
      const maxDimension = 100;
      const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Collect color samples
      const colorMap = new Map<string, number>();
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Skip very light or very dark colors
        const brightness = (r + g + b) / 3;
        if (brightness < 30 || brightness > 225) continue;
        
        // Skip grayscale colors
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min < 30) continue;
        
        // Quantize to reduce similar colors
        const qr = Math.round(r / 20) * 20;
        const qg = Math.round(g / 20) * 20;
        const qb = Math.round(b / 20) * 20;
        
        const hex = `#${[qr, qg, qb].map(n => n.toString(16).padStart(2, '0')).join('')}`;
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
      }
      
      // Sort by frequency and get top colors
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color);
      
      // Ensure we have 12 distinct colors
      const distinctColors: string[] = [];
      const usedHues = new Set<number>();
      
      for (const color of sortedColors) {
        const [r, g, b] = hexToRgb(color);
        const hue = rgbToHue(r, g, b);
        
        // Check if hue is sufficiently different
        let isDifferent = true;
        for (const used of usedHues) {
          if (Math.abs(hue - used) < 30 && Math.abs(hue - used) > 330) {
            isDifferent = false;
            break;
          }
        }
        
        if (isDifferent) {
          distinctColors.push(color);
          usedHues.add(hue);
          if (distinctColors.length >= 12) break;
        }
      }
      
      // Fill remaining with generated colors if needed
      while (distinctColors.length < 12) {
        const hue = (distinctColors.length * 30) % 360;
        const color = hslToHex(hue, 70, 50);
        distinctColors.push(color);
      }
      
      resolve(distinctColors);
    };
    
    img.onerror = () => {
      // Fallback to default palette
      resolve(generateDefaultPalette());
    };
    
    img.src = imageUrl;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = parseInt(h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHue(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let hue = 0;
  if (delta === 0) return 0;
  
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  
  return Math.round(hue * 60);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }
  
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateDefaultPalette(): string[] {
  return [
    "#e74c3c", "#e67e22", "#f39c12", "#f1c40f",
    "#2ecc71", "#27ae60", "#3498db", "#2980b9",
    "#9b59b6", "#8e44ad", "#e91e63", "#c0392b"
  ];
}
