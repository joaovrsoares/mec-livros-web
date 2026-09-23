import puppeteer from "puppeteer";
import { PDFDocument, PDFPage } from "pdf-lib";

export function toPdfHexString(str: string): string {
  const fullStr = "\uFEFF" + str;
  let hex = "";
  for (let i = 0; i < fullStr.length; i++) {
    const code = fullStr.charCodeAt(i);
    hex += code.toString(16).padStart(4, "0");
  }
  return "<" + hex.toUpperCase() + ">";
}

export function injectPdfMetadata(
  pdfBuffer: Buffer,
  metadata: { title?: string; author?: string }
): Buffer {
  let pdfString = pdfBuffer.toString("latin1");

  // Fix outline bookmark if Chromium clipped 'Capa' into 'C'
  const outlineCRegex = /(\d+\s+0\s+obj\s*<<[\s\S]*?\/Title\s*)(?:\(C\)|\(C\r?\n\)|<FEFF0043>)([\s\S]*?>>\s*endobj)/g;
  pdfString = pdfString.replace(outlineCRegex, (match, before, after) => {
    if (before.includes("/Parent") || after.includes("/Parent") || before.includes("/Dest") || after.includes("/Dest")) {
      return `${before}(Capa)${after}`;
    }
    return match;
  });

  if (!metadata.author && !metadata.title) {
    return Buffer.from(pdfString, "latin1");
  }

  const trailerRegex = /trailer\s*<<([\s\S]*?)>>\s*startxref\s*(\d+)\s*%%EOF\s*$/;
  const trailerMatch = pdfString.match(trailerRegex);
  if (!trailerMatch) {
    return Buffer.from(pdfString, "latin1");
  }

  const originalTrailerContent = trailerMatch[1];
  const prevStartxref = trailerMatch[2];

  const infoRefMatch = originalTrailerContent.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
  const infoObjNum = infoRefMatch ? infoRefMatch[1] : "1";
  const infoGenNum = infoRefMatch ? infoRefMatch[2] : "0";

  const infoObjRegex = new RegExp(`${infoObjNum}\\s+${infoGenNum}\\s+obj\\s*<<([\\s\\S]*?)>>\\s*endobj`);
  const infoObjMatch = pdfString.match(infoObjRegex);

  let infoBody = infoObjMatch ? infoObjMatch[1] : "";

  if (metadata.title && !/\/Title\b/.test(infoBody)) {
    infoBody = `/Title ${toPdfHexString(metadata.title)}\n` + infoBody;
  }
  if (metadata.author) {
    if (/\/Author\b/.test(infoBody)) {
      infoBody = infoBody.replace(/\/Author\s*(?:\([^)]*\)|<[^>]*>)/, `/Author ${toPdfHexString(metadata.author)}`);
    } else {
      infoBody = `/Author ${toPdfHexString(metadata.author)}\n` + infoBody;
    }
  }

  const newObj = `${infoObjNum} ${infoGenNum} obj\n<<\n${infoBody.trim()}\n>>\nendobj\n`;
  const newObjOffset = Buffer.byteLength(pdfString, "latin1");

  let newTrailerContent = originalTrailerContent.trim();
  if (!/\/Prev\b/.test(newTrailerContent)) {
    newTrailerContent += `\n/Prev ${prevStartxref}`;
  } else {
    newTrailerContent = newTrailerContent.replace(/\/Prev\s+\d+/, `/Prev ${prevStartxref}`);
  }

  const xrefOffset = newObjOffset + Buffer.byteLength(newObj, "latin1");
  const newXref = `xref\n${infoObjNum} 1\n${String(newObjOffset).padStart(10, "0")} 00000 n \ntrailer\n<<\n${newTrailerContent}\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(pdfString, "latin1"),
    Buffer.from(newObj + newXref, "latin1"),
  ]);
}

export async function generatePdfFromHtml(html: string, title: string): Promise<Buffer> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  console.log("[generatePdfFromHtml] Launching Puppeteer...");

  const browser = await puppeteer.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--js-flags=--max-old-space-size=16384",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
    headless: true,
  });

  try {
    console.log("[generatePdfFromHtml] Creating new page...");
    const page = await browser.newPage();
    console.log("[generatePdfFromHtml] Setting content, HTML length:", html.length);
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    console.log("[generatePdfFromHtml] Content set, generating PDF...");

    if (title) {
      await page.evaluate((title: string) => {
        document.title = title;
      }, title);
    }

    console.log("[generatePdfFromHtml] Generating PDF...");
    const pdfUint8Array = await page.pdf({
      format: "A4",
      outline: true,
      tagged: true,
      margin: {
        top: "25mm",
        bottom: "25mm",
        left: "25mm",
        right: "25mm",
      },
      printBackground: true,
      displayHeaderFooter: false,
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}

// Merge multiple PDF buffers into one using pdf-lib
export async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 1) return buffers[0];

  const mergedPdf = await PDFDocument.create();
  for (const buf of buffers) {
    const pdf = await PDFDocument.load(buf);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page: PDFPage) => mergedPdf.addPage(page));
  }
  const mergedBytes = await mergedPdf.save();
  return Buffer.from(mergedBytes);
}

import { rgb, StandardFonts } from "pdf-lib";

export async function addPageNumbers(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const text = `${i + 1} / ${pages.length}`;
    const fontSize = 9;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    
    // 25mm is approximately 70.8 points. We place the text vertically centered in that bottom margin,
    // which is about 35 points from the bottom edge.
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: 35,
      size: fontSize,
      font: font,
      color: rgb(0.533, 0.533, 0.533),
    });
  }
  
  return Buffer.from(await pdfDoc.save());
}
