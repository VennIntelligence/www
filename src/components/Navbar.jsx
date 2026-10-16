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
// hero 已由 Logo 承担入口，不再作为独立菜单项
// 带 children 的条目渲染成下拉分组：顶栏只占一格，之后新增项目往 children 里加即可，
// 不必再重排顶栏。等项目数量超出下拉承载力，再把 children 迁到独立的 /projects 列表页。
const NAV_LINKS = [
  { id: 'funding' },
  { id: 'projects', children: [{ id: 'drive' }, { id: 'omega' }, { id: 'sigma' }] },
  { id: 'consultants' },
  { id: 'blog', route: '/blog' },
];

// 触发导航栏滚动状态（如模糊增强等视觉变化）的滚动像素阈值
/* 导航栏滚动态滞回阈值：向下越过 ENTER(默认 48px) 才进入 scrolled，
   向上回到 EXIT(默认 12px) 以内才退出 —— 在阈值附近来回滚动不再反复
   翻转状态（每次翻转都会重算液态玻璃位移图，O(宽×高) 的开销）。 */
const NAVBAR_SCROLL_ENTER = 48;
const NAVBAR_SCROLL_EXIT = 12;

// 用于监听当前访问的页面区块，从而高亮对应导航菜单项
const NAVBAR_SECTION_OBSERVER = {
  threshold: [0, 0.2, 0.5, 0.8], // 多阈值检测，更精细地判断哪个区块最「前景」
  rootMargin: '-60px 0px 0px 0px', // 顶部偏移量，用于平衡导航的高度带来的遮挡偏差
};

// 用于从多个同时可见的区块中选出当前「主角」——取 DOM 顺序最靠后且交叉比 ≥ 20% 的区块。
// 必须与 HomePage.jsx 里 section 的真实 DOM 顺序一致（导航菜单的排列顺序与此无关）。
// hero 虽然不是菜单项，仍然参与可见性检测（滚到顶部时不应高亮任何菜单项）
const SECTION_ORDER = ['hero', 'funding', 'drive', 'sigma', 'omega', 'consultants'];

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
  // 默认 null：当用户在 hero 区域时不高亮任何菜单项
  const [activeSection, setActiveSection] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // 当前展开的桌面端下拉分组 id（null 表示全部收起）
  const [openGroup, setOpenGroup] = useState(null);
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
    const onScroll = () =>
      setScrolled((prev) => (prev ? window.scrollY > NAVBAR_SCROLL_EXIT : window.scrollY > NAVBAR_SCROLL_ENTER));
    window.addEventListener('scroll', onScroll, { passive: true });

    // 非首页不需要 section 观测
    if (!isHome) {
      setActiveSection(null);
      return () => window.removeEventListener('scroll', onScroll);
    }

    // 记录每个 section 的实时交叉比例
    const ratioMap = new Map();
    let observer = null;
    let rafId = null;

    // HomePage 是 lazy() 加载的，section 元素可能还不在 DOM。
    // 用 rAF 轮询等待至少一个 section 出现后再启动 IntersectionObserver。
    const trySetupObserver = () => {
      const sections = SECTION_ORDER
        .map(id => document.getElementById(id))
        .filter(Boolean);

      if (sections.length === 0) {
        // 下一帧继续尝试
        rafId = requestAnimationFrame(trySetupObserver);
        return;
      }

      observer = new IntersectionObserver(
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

      sections.forEach(el => observer.observe(el));
    };

    rafId = requestAnimationFrame(trySetupObserver);

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [isHome]);

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

  // 桌面端下拉：点击面板外部或按 Escape 收起
  useEffect(() => {
    if (!openGroup) return undefined;

    const onPointerDown = (event) => {
      if (!event.target.closest('.navbar__group')) setOpenGroup(null);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpenGroup(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openGroup]);

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

  // 点击菜单项时平滑滚动到对应区块（兼容 scroll-snap）
  const scrollToSection = (id) => {
    setMenuOpen(false);
    setOpenGroup(null);
    if (!isHome) {
      // 不在首页时，先导航回首页并携带 hash
      window.location.href = `/#${id}`;
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 渲染单个可点击菜单项（路由链接或首页锚点按钮），分组子项复用同一套样式
  const renderLeaf = (link) => {
    const className = (active) => `navbar__link ${active ? 'navbar__link--active' : ''}`.trim();

    if (link.route) {
      return (
        <Link
          key={link.id}
          to={link.route}
          className={className(!isHome && location.pathname === link.route)}
          onClick={() => {
            setMenuOpen(false);
            setOpenGroup(null);
          }}
        >
          {COPY.nav[lang][link.id]}
        </Link>
      );
    }

    return (
      <button
        key={link.id}
        type="button"
        className={className(isHome && activeSection === link.id)}
        onClick={() => scrollToSection(link.id)}
      >
        {COPY.nav[lang][link.id]}
      </button>
    );
  };

  // 分组标题的高亮跟随其任一子区块 —— 滚到 Ω 或 Σ 时 Projects 亮起
  const isGroupActive = (link) =>
    isHome && link.children.some(child => activeSection === child.id);

  const renderLinks = (variant) => (
    NAV_LINKS.map(link => {
      if (!link.children) return renderLeaf(link);

      // 移动端不做二级折叠，分组标题 + 缩进子项直接铺开，少一次点击
      if (variant === 'mobile') {
        return (
          <div key={link.id} className="navbar__group navbar__group--mobile">
            <span className="navbar__group-label">{COPY.nav[lang][link.id]}</span>
            {link.children.map(child => renderLeaf(child))}
          </div>
        );
      }

      const open = openGroup === link.id;
      return (
        <div
          key={link.id}
          className="navbar__group"
          onMouseEnter={() => setOpenGroup(link.id)}
          onMouseLeave={() => setOpenGroup(null)}
        >
          <button
            type="button"
            className={`navbar__link navbar__link--trigger ${isGroupActive(link) ? 'navbar__link--active' : ''}`}
            aria-haspopup="true"
            aria-expanded={open}
            onClick={(event) => {
              // 鼠标：hover 已经展开，click 只保持展开，不能 toggle 关闭（否则表现为点不动）
              // 触屏：没有 hover，tap 需要既能开也能关
              const isTouch = event.nativeEvent.pointerType === 'touch';
              setOpenGroup(prev => (isTouch && prev === link.id ? null : link.id));
            }}
          >
            {COPY.nav[lang][link.id]}
            <span className="navbar__caret" aria-hidden="true" />
          </button>

          <div className={`navbar__dropdown ${open ? 'navbar__dropdown--open' : ''}`}>
            {link.children.map(child => renderLeaf(child))}
          </div>
        </div>
      );
    })
  );

  const desktopNavInner = (
    <div className="navbar__inner">
      <a href={isHome ? '#hero' : '/'} className="navbar__logo" onClick={() => setMenuOpen(false)}>
        <BrandWordmark variant="full" size={19} />
      </a>

      <div className="navbar__links desktop-links">
        {renderLinks('desktop')}
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
            {renderLinks('mobile')}
          </div>
        </div>
      </div>
    </nav>
  );
}
