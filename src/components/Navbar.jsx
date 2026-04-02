import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LiquidGlass } from '@liquidglass/react';
import BrandWordmark from './common/BrandWordmark';
import LanguageToggle from './LanguageToggle';
import { COPY } from '../config/i18n';
import { useLanguage } from '../context/useLanguage';
import { getGlassCompatibility } from '../utils/glassCompatibility';
import { glassClass } from '../utils/glassUtils';
import '../styles/components/navbar.css';

// 导航栏区块配置，已从硬编码文本变为仅用ID查找，配合多语言字典进行翻译使用
const NAV_LINKS = [
  { id: 'hero' },
  { id: 'sigma' },
  { id: 'omega' },
  { id: 'consultants' },
  { id: 'blog', route: '/blog' },
];

// 触发导航栏滚动状态（如模糊增强等视觉变化）的滚动像素阈值
const NAVBAR_SCROLL_THRESHOLD = 30;

// 用于监听当前访问的页面区块，从而高亮对应导航菜单项
const NAVBAR_SECTION_OBSERVER = {
  threshold: [0, 0.2, 0.5, 0.8], // 多阈值检测，更精细地判断哪个区块最「前景」
  rootMargin: '-60px 0px 0px 0px', // 顶部偏移量，用于平衡导航的高度带来的遮挡偏差
};

// 用于从多个同时可见的区块中选出当前「主角」——取 DOM 顺序最靠后且交叉比 ≥ 20% 的区块
const SECTION_ORDER = NAV_LINKS.map(l => l.id);

// 导航栏液态毛玻璃组件的基础物理渲染常量
const NAVBAR_GLASS_BASE = {
  borderRadius: 0, // 圆角度数，默认无圆角（占满边缘）
  contrast: 1.2, // 玻璃表面材质对比度系数
  shadowIntensity: 0.1, // 模型背部投射到物理环境的发光/阴影强度
  elasticity: 0.5, // （如果存在物理悬浮或形变互动）弹性和恢复原始状态的速度
  zIndex: 100, // Z轴层级，确保菜单悬浮于各类动效最上层
  className: 'navbar__glass',
};

// 【未滚动时】页面静止在最顶部时的毛玻璃外观参数（偏透明隐形、平稳）
const NAVBAR_GLASS_IDLE = {
  blur: 0.1, // 背景模糊程度
  brightness: 1.5, // 毛玻璃材质整体的透光率、亮度增益
  saturation: 1.3, // 色彩饱和度增益比例，让透过的底层颜色更润泽
  displacementScale: 2.9, // 表面涟漪波浪/曲面扭曲扰动系数（数值越大曲率越弯折）
};

// 【滚动发生后】吸附在顶部滑动后的毛玻璃动态外观呈现（加强阻挡、凸出存在感）
const NAVBAR_GLASS_SCROLLED = {
  blur: 1.2, // 更高的糊化效果，隔绝底下滚过的图文带来的视觉干扰
  brightness: 1.25, // 材质进一步提亮，形成视觉焦点和玻璃质感
  saturation: 1.6, // 底色反射的色彩进一步浓郁，提升整体环境光影响
  displacementScale: 1.3, // 使表面发生更剧烈的扭曲，增加液体流动或厚玻璃折射的质感
};

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('hero');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [glassCompatibility, setGlassCompatibility] = useState(() => getGlassCompatibility());
  const { lang, setLang } = useLanguage();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isMobile = glassCompatibility.isMobileViewport;
  const useLiquidGlass = glassCompatibility.liquidSupported;
  const glassProps = {
    ...NAVBAR_GLASS_BASE,
    ...(scrolled ? NAVBAR_GLASS_SCROLLED : NAVBAR_GLASS_IDLE),
  };
  // 使用公共工具函数生成标准化 fallback class，自动包含正确的 --frost / --solid tier 后缀
  const glassFallbackClassName = glassClass('navbar__glass-fallback', {
    scrolled,
    compat: glassCompatibility,
    extra: [isMobile ? 'navbar__glass-fallback--mobile' : 'navbar__glass-fallback--desktop'],
  });

  useEffect(() => {
    // 记录每个 section 的实时交叉比例
    const ratioMap = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratioMap.set(entry.target.id, entry.intersectionRatio);
        }
        // 从 DOM 顺序最后（最靠近屏幕底部）的可见 section 中，选交叉比最大的
        let bestId = null;
        let bestScore = -1;
        for (const id of SECTION_ORDER) {
          const ratio = ratioMap.get(id) || 0;
          if (ratio >= 0.15) {
            // 靠后的 section 给予 bonus，优先级更高
            const orderBonus = SECTION_ORDER.indexOf(id) * 0.01;
            const score = ratio + orderBonus;
            if (score > bestScore) {
              bestScore = score;
              bestId = id;
            }
          }
        }
        if (bestId) setActiveSection(bestId);
      },
      NAVBAR_SECTION_OBSERVER
    );

    NAV_LINKS.forEach(link => {
      if (link.route) return; // blog 等外部路由不参与 IO 检测
      const el = document.getElementById(link.id);
      if (el) observer.observe(el);
    });

    const onScroll = () => setScrolled(window.scrollY > NAVBAR_SCROLL_THRESHOLD);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const nextCompatibility = getGlassCompatibility();
      setGlassCompatibility(nextCompatibility);
      if (!nextCompatibility.isMobileViewport) setMenuOpen(false);
    };

    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !isMobile) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, menuOpen]);

  const renderLinks = () => (
    NAV_LINKS.map(link => {
      if (link.route) {
        return (
          <Link
            key={link.id}
            to={link.route}
            className={`navbar__link ${!isHome && location.pathname === link.route ? 'navbar__link--active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {COPY.nav[lang][link.id]}
          </Link>
        );
      }

      const href = isHome ? `#${link.id}` : `/#${link.id}`;
      return (
        <a
          key={link.id}
          href={href}
          className={`navbar__link ${isHome && activeSection === link.id ? 'navbar__link--active' : ''}`}
          onClick={() => setMenuOpen(false)}
        >
          {COPY.nav[lang][link.id]}
        </a>
      );
    })
  );

  const desktopNavInner = (
    <div className="navbar__inner">
      <a href={isHome ? '#hero' : '/'} className="navbar__logo" onClick={() => setMenuOpen(false)}>
        <BrandWordmark variant="full" size={19} />
      </a>

      <div className="navbar__links desktop-links">
        {renderLinks()}
      </div>

      <div className="navbar__right">
        <LanguageToggle lang={lang} onChange={setLang} />
      </div>
    </div>
  );

  const mobileNavInner = (
    <div className="navbar__inner">
      <a href={isHome ? '#hero' : '/'} className="navbar__logo" onClick={() => setMenuOpen(false)}>
        <BrandWordmark variant="full" size={19} />
      </a>

      <div className="navbar__right">
        <LanguageToggle lang={lang} onChange={setLang} />

        <button
          type="button"
          className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--open' : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-menu"
        >
          <span /><span /><span />
        </button>
      </div>
    </div>
  );

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="main-nav" data-lang={lang}>
      {/* 导航栏内容：能力优先，Liquid 可用才启用；其余统一走稳定磨砂/实体降级。 */}
      {useLiquidGlass ? (
        <LiquidGlass {...glassProps}>
          {desktopNavInner}
        </LiquidGlass>
      ) : (
        <div className={glassFallbackClassName}>
          {isMobile ? mobileNavInner : desktopNavInner}
        </div>
      )}

      {/* Mobile Nav links: top dropdown panel with click-away close area */}
      <div
        className={`navbar__mobile-menu ${menuOpen ? 'navbar__mobile-menu--open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      >
        <div className="navbar__mobile-backdrop" />
        <div
          className="navbar__mobile-panel"
          id="mobile-nav-menu"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="navbar__links mobile-links">
            {renderLinks()}
          </div>
        </div>
      </div>
    </nav>
  );
}
