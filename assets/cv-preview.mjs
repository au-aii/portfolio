import { getDocument, GlobalWorkerOptions, TextLayer } from './pdfjs/pdf.min.mjs';

GlobalWorkerOptions.workerSrc = new URL('./pdfjs/pdf.worker.min.mjs', import.meta.url).href;

const documents = new Map();
const previews = Object.fromEntries(['ja', 'en'].map(lang => [lang, document.getElementById(`preview-${lang}`)]));

async function renderPreview(lang) {
  const preview = previews[lang];
  if (!preview || preview.offsetParent === null) return;

  const width = Math.floor(preview.clientWidth - 24);
  if (width < 100 || Number(preview.dataset.renderedWidth) === width) return;

  try {
    let pdf = documents.get(lang);
    if (!pdf) {
      pdf = await getDocument({ url: `./cv-${lang}.pdf` }).promise;
      documents.set(lang, pdf);
    }

    preview.replaceChildren();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / baseViewport.width });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      const paper = document.createElement('div');
      paper.className = 'pdf-page';
      paper.style.width = `${viewport.width}px`;
      paper.style.height = `${viewport.height}px`;
      paper.style.setProperty('--scale-factor', viewport.scale);

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width * pixelRatio);
      canvas.height = Math.ceil(viewport.height * pixelRatio);
      paper.appendChild(canvas);

      const text = document.createElement('div');
      text.className = 'textLayer';
      paper.appendChild(text);
      preview.appendChild(paper);

      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport,
        transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
      }).promise;
      const layer = new TextLayer({
        textContentSource: await page.getTextContent(),
        container: text,
        viewport,
      });
      await layer.render();
    }
    preview.dataset.renderedWidth = String(width);
  } catch (error) {
    preview.textContent = lang === 'ja'
      ? 'プレビューを表示できません。上のリンクからPDFを開いてください。'
      : 'The preview could not be displayed. Open the PDF using the link above.';
    console.error('PDF preview failed', error);
  }
}

document.addEventListener('cv-language-change', event => renderPreview(event.detail));
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const lang = document.getElementById('panel-ja').hidden ? 'en' : 'ja';
    renderPreview(lang);
  }, 150);
});
renderPreview('ja');
