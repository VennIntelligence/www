// Vite plugin: preload the lazy HomePage chunk from index.html.
// HomePage is code-split so /blog and /drive never download three.js, but on "/"
// that split costs a full round trip: index.js must execute before the browser even
// learns about HomePage-*.js. This plugin injects <link rel="modulepreload"> for the
// HomePage chunk, its static imports and its CSS, so they download in parallel with index.js.
// Each tag carries data-route="/" and worker.js strips them for every other path.
const HOME_FACADE = /[\\/]pages[\\/]HomePage\.jsx$/;

export default function preloadHomePlugin() {
  return {
    name: 'vennai-preload-home',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const home = Object.values(bundle).find(
          (c) => c.type === 'chunk' && HOME_FACADE.test(c.facadeModuleId || ''),
        );
        if (!home) return html;

        const tags = [];
        for (const file of [home.fileName, ...home.imports]) {
          if (html.includes(`/${file}`)) continue;
          tags.push({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}`, 'data-route': '/' }, injectTo: 'head' });
        }
        for (const css of home.viteMetadata?.importedCss || []) {
          if (html.includes(`/${css}`)) continue;
          tags.push({ tag: 'link', attrs: { rel: 'preload', as: 'style', href: `/${css}`, 'data-route': '/' }, injectTo: 'head' });
        }
        return { html, tags };
      },
    },
  };
}
