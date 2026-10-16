import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Navbar from './components/Navbar';
import ScrollToTop from './components/common/ScrollToTop';
import NotFound from './pages/NotFound';
import { LanguageProvider } from './context/LanguageContext';
import { syncGlassCompatibility } from './utils/glassCompatibility';
import { useDocumentMeta } from './hooks/useDocumentMeta';
import './index.css';

// ── Code-split heavy pages ──
// HomePage depends on Three.js + framer-motion (~650KB parsed);
// lazy() keeps /blog and other routes from loading them at all, saving ~150-200MB of memory.
const HomePage = lazy(() => import('./pages/HomePage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));
const DrivePage = lazy(() => import('./pages/DrivePage'));
const ApplyPage = lazy(() => import('./pages/ApplyPage'));

// GPU tuning panel: loaded only in dev:gpu mode (fully excluded from production builds)
const GPUDebugPanel = import.meta.env.VITE_GPU_DEBUG === 'true'
  ? lazy(() => import('./components/GPUDebugPanel'))
  : null;

/**
 * DocumentMetaUpdater — keeps SEO meta tags in sync with route and language.
 * Must render inside BrowserRouter + LanguageProvider because it uses
 * useLocation and useLanguage.
 */
function DocumentMetaUpdater() {
  useDocumentMeta();
  return null;
}

/**
 * App — pure routing root.
 * Navbar sits outside the routes and is shared by every page.
 */
function App() {
  useEffect(() => {
    const updateGlassCompatibility = () => {
      syncGlassCompatibility();
    };

    updateGlassCompatibility();
    window.addEventListener('resize', updateGlassCompatibility, { passive: true });
    window.addEventListener('orientationchange', updateGlassCompatibility, { passive: true });

    return () => {
      window.removeEventListener('resize', updateGlassCompatibility);
      window.removeEventListener('orientationchange', updateGlassCompatibility);
    };
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <DocumentMetaUpdater />
        <ScrollToTop />
        <Navbar />
        <Routes>
          {/* Landing page — lazy loaded; Three.js + framer-motion load only on this route */}
          <Route path="/" element={
            <Suspense fallback={null}>
              <HomePage />
            </Suspense>
          } />

          {/* Blog listing — lightweight page, own chunk */}
          <Route path="/blog" element={
            <Suspense fallback={null}>
              <BlogPage />
            </Suspense>
          } />

          {/* Blog article — one URL per post */}
          <Route path="/blog/:slug" element={
            <Suspense fallback={null}>
              <BlogArticlePage />
            </Suspense>
          } />

          {/* Autonomous driving project page — AlpaSim closed-loop challenge 2026, kept after the event */}
          <Route path="/drive" element={
            <Suspense fallback={null}>
              <DrivePage />
            </Suspense>
          } />

          {/* Grant application form (Turnstile script loads only on this route) */}
          <Route path="/apply" element={
            <Suspense fallback={null}>
              <ApplyPage />
            </Suspense>
          } />

          {/* Product sub-routes — to be added */}
          {/* <Route path="/product/venn-trigger-trade" element={<ProductPage />} /> */}
          {/* <Route path="/product/venn-trigger-trade/dashboard" element={<TriggerDashboard />} /> */}

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* GPU tuning panel — dev:gpu mode only */}
        {GPUDebugPanel && (
          <Suspense fallback={null}>
            <GPUDebugPanel />
          </Suspense>
        )}
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;

