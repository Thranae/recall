import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function downloadImageFile(urlOrDataUrl: string, rawFilename: string): Promise<boolean> {
  const filename = rawFilename.endsWith('.png') || rawFilename.endsWith('.jpg') || rawFilename.endsWith('.jpeg') || rawFilename.endsWith('.webp')
    ? rawFilename
    : `${rawFilename}.png`;

  // 1. Native Capacitor Platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      let base64Data = '';
      if (urlOrDataUrl.startsWith('data:')) {
        const parts = urlOrDataUrl.split(',');
        base64Data = parts[1] || parts[0];
      } else {
        const res = await fetch(urlOrDataUrl);
        const blob = await res.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1] || result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Write to device public documents or cache
      let writeRes;
      try {
        writeRes = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
      } catch {
        writeRes = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
      }

      // Launch native Save/Share dialog
      if (writeRes?.uri) {
        try {
          await Share.share({
            title: filename,
            text: `Download ${filename}`,
            url: writeRes.uri,
            dialogTitle: `Save ${filename}`,
          });
        } catch {
          // User closed share dialog
        }
      }

      // Also trigger Android WebView DownloadListener for direct Downloads folder enqueue
      if (!urlOrDataUrl.startsWith('data:')) {
        const finalUrl = urlOrDataUrl.includes('?')
          ? (urlOrDataUrl.includes('filename=') ? urlOrDataUrl : `${urlOrDataUrl}&filename=${encodeURIComponent(filename)}`)
          : `${urlOrDataUrl}?filename=${encodeURIComponent(filename)}`;
        const link = document.createElement('a');
        link.href = finalUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return true;
    } catch (nativeErr) {
      console.warn('Native download encountered error, using web fallback:', nativeErr);
    }
  }

  // 2. Standard Web Browser
  try {
    let blobUrl = '';
    if (urlOrDataUrl.startsWith('data:')) {
      blobUrl = urlOrDataUrl;
    } else {
      const res = await fetch(urlOrDataUrl);
      const blob = await res.blob();
      blobUrl = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (!urlOrDataUrl.startsWith('data:')) {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    }
    return true;
  } catch (webErr) {
    console.error('Web download error:', webErr);
    const a = document.createElement('a');
    a.href = urlOrDataUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return false;
  }
}

