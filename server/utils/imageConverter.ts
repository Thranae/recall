type HeicConvertFn = (options: {
  buffer: Buffer;
  format: 'JPEG' | 'PNG';
  quality?: number;
}) => Promise<ArrayBuffer | Uint8Array | Buffer>;

const HEIC_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'mif1',
  'msf1',
  'heim',
  'heis',
  'hevm',
  'hevs',
]);

/**
 * Checks whether a buffer/mime/filename represents an Apple HEIC/HEIF image
 * by MIME type, file extension, or ISO BMFF `ftyp` box brand.
 */
export function isHeicFormat(
  buffer?: Buffer | null,
  mimeType?: string | null,
  filename?: string | null
): boolean {
  if (mimeType && /heic|heif/i.test(mimeType)) {
    return true;
  }
  if (filename && /\.(heic|heif)$/i.test(filename)) {
    return true;
  }
  if (buffer && buffer.length >= 12) {
    const boxType = buffer.toString('latin1', 4, 8);
    if (boxType === 'ftyp') {
      const majorBrand = buffer.toString('latin1', 8, 12).toLowerCase();
      if (HEIC_BRANDS.has(majorBrand)) {
        return true;
      }
      // Check compatible brands list if present inside the ftyp box
      const boxSize = Math.min(buffer.readUInt32BE(0), buffer.length, 64);
      for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
        const brand = buffer.toString('latin1', offset, offset + 4).toLowerCase();
        if (HEIC_BRANDS.has(brand)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function detectImageMimeType(buffer: Buffer, fallbackMime?: string | null): string {
  if (buffer.length >= 4) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }
    if (buffer.length >= 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') {
      return 'image/webp';
    }
    if (buffer.toString('latin1', 0, 3) === 'GIF') {
      return 'image/gif';
    }
  }
  if (fallbackMime && fallbackMime.startsWith('image/') && !/octet-stream|heic|heif/i.test(fallbackMime)) {
    return fallbackMime;
  }
  return 'image/jpeg';
}

export async function ensureWebCompatibleImage(
  buffer: Buffer,
  mimeType?: string | null,
  filename?: string | null
): Promise<{ buffer: Buffer; mimeType: string; filename: string; converted: boolean }> {
  const safeName = filename || 'image.jpg';

  if (isHeicFormat(buffer, mimeType, safeName)) {
    const mod = await import('heic-convert');
    const convert = ((mod as { default?: HeicConvertFn }).default ?? mod) as HeicConvertFn;
    const convertedRaw = await convert({
      buffer,
      format: 'JPEG',
      quality: 0.88,
    });
    const jpegBuffer = Buffer.isBuffer(convertedRaw) ? convertedRaw : Buffer.from(convertedRaw);
    const jpegName = /\.(heic|heif)$/i.test(safeName)
      ? safeName.replace(/\.(heic|heif)$/i, '.jpg')
      : `${safeName}.jpg`;

    return {
      buffer: jpegBuffer,
      mimeType: 'image/jpeg',
      filename: jpegName,
      converted: true,
    };
  }

  return {
    buffer,
    mimeType: detectImageMimeType(buffer, mimeType),
    filename: safeName,
    converted: false,
  };
}

