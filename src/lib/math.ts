import katex from 'katex';

// Svelte action: set innerHTML dari `html`, lalu render semua .math-latex
// menjadi persamaan KaTeX. Elemen yang sudah berisi HTML katex (tanpa data-latex)
// dibiarkan apa adanya agar data lama tetap tampil.
export function renderMath(node: HTMLElement, html?: string) {
  function apply(h?: string) {
    if (h != null) node.innerHTML = h;
    const spans = node.querySelectorAll('.math-latex');
    spans.forEach((span) => {
      const latex = span.getAttribute('data-latex');
      if (!latex) return;
      try {
        span.innerHTML = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false,
          output: 'html'
        });
      } catch {
        span.textContent = latex;
      }
    });
  }
  apply(html);
  // Diperlukan agar Svelte menjalankan ulang action saat prop `html`
  // berubah (mis. navigasi antar-soal di ujian). Tanpa `update`, action
  // hanya berjalan sekali saat mount → soal tampak tidak berubah.
  return { update: apply };
}
