import { createDecipheriv } from "crypto";
import JSZip from "jszip";


function decodeBase64Strict(text: string): Buffer | null {
  const normalized = text.replace(/\s+/g, "");
  if (!normalized || normalized.length % 4 !== 0) {
    return null;
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    return null;
  }

  try {
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}

export function decryptResource(data: Buffer): Buffer {
  const text = data.toString("utf-8").trim();
  const ciphertext = decodeBase64Strict(text);
  if (!ciphertext) {
    return data;
  }

  const rawKey = process.env.MEC_LIVROS_AES_KEY || (process.env.NODE_ENV === "production" ? "" : "R1FTmXDFrfIlQvpLg8PkDvuuW3cmss56");
  const rawIv = process.env.MEC_LIVROS_AES_IV || (process.env.NODE_ENV === "production" ? "" : "lSrKOxW5xDPU7BMr");

  if (!rawKey || !rawIv) {
    throw new Error(
      "As variáveis MEC_LIVROS_AES_KEY (32 bytes) e MEC_LIVROS_AES_IV (16 bytes) devem estar configuradas no ambiente.",
    );
  }

  const key = Buffer.from(rawKey, "utf-8");
  const iv = Buffer.from(rawIv, "utf-8");

  if (key.length !== 32 || iv.length !== 16) {
    throw new Error(
      "MEC_LIVROS_AES_KEY deve ter exatamente 32 bytes e MEC_LIVROS_AES_IV deve ter exatamente 16 bytes.",
    );
  }

  try {
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return data;
  }
}

export async function decryptEpubBuffer(epub: Buffer): Promise<{
  output: Buffer;
  totalHtmlFiles: number;
  decryptedHtmlFiles: number;
}> {
  const zip = await JSZip.loadAsync(epub);
  let totalHtmlFiles = 0;
  let decryptedHtmlFiles = 0;

  const entries = Object.entries(zip.files);
  for (const [name, entry] of entries) {
    if (entry.dir || !/\.(xhtml|html)$/i.test(name)) {
      continue;
    }

    totalHtmlFiles += 1;
    const original = await entry.async("nodebuffer");
    const decrypted = decryptResource(original);
    if (!decrypted.equals(original)) {
      decryptedHtmlFiles += 1;
      zip.file(name, decrypted);
    }
  }

  const mimetype = zip.file("mimetype");
  if (mimetype) {
    const mimetypeData = await mimetype.async("nodebuffer");
    zip.file("mimetype", mimetypeData, { compression: "STORE" });
  }

  const output = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return { output, totalHtmlFiles, decryptedHtmlFiles };
}
