import { initApis } from "./modules/apis.js";
import { initAuth } from "./modules/auth.js";
import { initProducts, renderMarketplace } from "./modules/products.js";
import { loadState } from "./modules/store.js";
import { initUI } from "./modules/ui.js";

async function bootstrap() {
  try {
    await loadState();
    initUI();
    initAuth();
    initApis();
    initProducts();
    renderMarketplace();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:Sora,sans-serif;background:#fff4f8;color:#2d1a23;">
        <section style="max-width:560px;background:#ffffff;border:1px solid #ffd6e7;border-radius:24px;padding:28px;box-shadow:0 18px 44px rgba(212,64,126,.12);">
          <h1 style="font-size:1.6rem;margin-bottom:12px;">No se pudo iniciar el sistema</h1>
          <p style="line-height:1.7;">La base de datos del navegador no pudo abrirse correctamente. Intenta recargar la pagina o abrirla en un navegador con soporte para IndexedDB.</p>
        </section>
      </main>
    `;
  }
}

bootstrap();
