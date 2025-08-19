// Upload via XHR so we get progress events.
export function uploadFile(
  url: string,
  file: File,
  opts?: { onProgress?: (pct: number) => void; adminPassword?: string }
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    // Make sure header name matches exactly what PHP expects
    if (opts?.adminPassword) xhr.setRequestHeader("X-Admin-Pass", opts.adminPassword);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts?.onProgress) opts.onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && json?.url) return resolve(json);
        reject(new Error(json?.error || `Upload failed (${xhr.status})`));
      } catch (e: any) {
        reject(new Error(e?.message || "Bad JSON from server"));
      }
    };

    xhr.send(fd);
  });
}
