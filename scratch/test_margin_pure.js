const puppeteer = require('puppeteer');
const fs = require('fs');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Test with a cover image inside epub-cover-page
  await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: A4 portrait;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: 100%;
    }
    .epub-chapter {
      page-break-before: always;
      break-before: page;
    }
    .epub-chapter:first-of-type,
    .epub-cover-page {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }
    .epub-cover-page {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
      width: 100% !important;
      height: 247mm !important;
      min-height: 247mm !important;
      max-height: 247mm !important;
      margin: 0 !important;
      padding: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      position: relative !important;
    }
    .epub-cover-page div {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      margin: 0 auto !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      text-align: center !important;
    }
    .epub-cover-page img {
      display: block !important;
      margin: auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  </style>
</head>
<body>
  <div class="epub-chapter epub-cover-page">
    <div id="cover-image">
      <!-- 600x800 red SVG to simulate cover image -->
      <svg width="600" height="900" viewBox="0 0 600 900" style="background: blue; max-width: 100%; max-height: 100%; display: block; margin: auto;">
        <rect width="600" height="900" fill="blue" />
        <text x="300" y="450" font-size="40" fill="white" text-anchor="middle">CAPA</text>
      </svg>
    </div>
  </div>
  <div class="epub-chapter">
    <h1>Capitulo 1</h1>
    <p>Texto do capitulo 1.</p>
  </div>
</body>
</html>`);

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '25mm',
      bottom: '25mm',
      left: '25mm',
      right: '25mm',
    }
  });

  fs.writeFileSync('/tmp/test_pure_margin.pdf', pdf);
  await browser.close();
  console.log('Saved /tmp/test_pure_margin.pdf');
}

test().catch(console.error);
