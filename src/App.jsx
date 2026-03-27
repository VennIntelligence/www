import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import BlogPage from './pages/BlogPage';
import BlogArticlePage from './pages/BlogArticlePage';
import NotFound from './pages/NotFound';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

/**
 * App — 纯路由根组件
 * Navbar 在路由外层，所有页面共享
 */
function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<HomePage />} />

          {/* 博客列表页 */}
          <Route path="/blog" element={<BlogPage />} />

          {/* 博客文章详情页 — 每篇文章独立 URL */}
          <Route path="/blog/:slug" element={<BlogArticlePage />} />

          {/* Product 子路由 — 后续添加 */}
          {/* <Route path="/product/venn-trigger-trade" element={<ProductPage />} /> */}
          {/* <Route path="/product/venn-trigger-trade/dashboard" element={<TriggerDashboard />} /> */}

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
