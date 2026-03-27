import { useState, useEffect, useRef } from 'react';
import { LiquidGlass } from '@liquidglass/react';
import { COPY } from '../../config/i18n';
import { useLanguage } from '../../context/useLanguage';
import LaserSphereBackground from '../../components/LaserSphereBackground';
import '../../styles/sections/consultants.css';

/* ================================================================
   白色高光亚克力面板参数
   ================================================================ */

const PANEL_GLASS_BASE = {
  blur: 0.1,                // 极低模糊，追求清澈（近乎没有）
  brightness: 1.8,          // 极高反射亮度
  saturation: 1.5,
  contrast: 1.2,
  displacementScale: 0.5,   // 极轻微的折射
  shadowIntensity: 0.02,
  borderRadius: 8,          // 硬朗小圆角
};

const PREMIUM_GLASS = {
  ...PANEL_GLASS_BASE,
  brightness: 2.2,          // 更强的高光感
  borderRadius: 6,
};

const MOBILE_BREAKPOINT = 768;

/**
 * ConsultantsSection — 居中布局 + 左对齐文本 + 居中按钮
 * 三张卡片（Profile + 2 Pricing）在画面中央水平排列
 */
export default function ConsultantsSection() {
  const { lang } = useLanguage();
  const content = COPY.consultants[lang];
  const sectionRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="consultants"
      className="consultants-section relative flex items-center justify-center overflow-hidden border-t border-[rgba(255,255,255,0.05)] py-20 md:py-28 px-5 md:px-10 lg:px-20"
    >
      {/* 激光星球 3D 背景 —— mobile 模式下固定在中下区域 */}
      <LaserSphereBackground sectionRef={sectionRef} isMobileProp={isMobile} />

      {/* 主容器：水平居中，三张卡片一排 */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 lg:gap-8">
        
        {/* Card 1: Profile Info */}
        <div className="w-full max-w-[340px] lg:flex-1 lg:max-w-none">
          <GlassPanel isMobile={isMobile} variant="profile">
            <div className="flex flex-col items-start text-left space-y-5 p-6 md:p-7">
              
              {/* Avatar Placeholder */}
              <div className="relative w-36 h-48 md:w-40 md:h-52 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm group transition-all duration-500 hover:border-white/30">
                <div className="absolute w-[120%] h-[1px] bg-white/20 rotate-45 transform origin-center transition-transform duration-700 group-hover:rotate-[225deg]" />
                <div className="absolute w-[120%] h-[1px] bg-white/20 -rotate-45 transform origin-center transition-transform duration-700 group-hover:-rotate-[225deg]" />
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-white tracking-wide">
                  {content.name}
                </h2>
                
                {/* Tags */}
                <div className="flex flex-wrap justify-start gap-2">
                  {content.tags.map((tag, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-[10px] md:text-[11px] text-gray-300 bg-white/[0.1] border border-white/10 rounded-sm font-mono tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Bios */}
                <div className="pt-1 text-gray-400 text-sm leading-relaxed">
                  <p>{content.bio1}</p>
                  <p className="mt-2 text-gray-300 font-medium">{content.bio2}</p>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Card 2 & 3: Pricing Cards */}
        {content.tiers.map((tier, idx) => {
          const isPremium = idx === 1;
          return (
            <div key={idx} className={`w-full max-w-[340px] lg:flex-1 lg:max-w-none ${isPremium ? 'z-10' : 'z-0'}`}>
              <GlassPanel isMobile={isMobile} variant={isPremium ? 'premium' : 'standard'}>
                <div className={`relative z-10 flex flex-col h-full p-6 items-start text-left ${isPremium ? 'consultants-card--premium' : 'consultants-card--standard'}`}>
                  <h3 className={`text-lg font-medium mb-3 tracking-wide ${isPremium ? 'text-white' : 'text-gray-300'}`}>
                    {tier.name}
                  </h3>
                  
                  <div className="flex items-baseline gap-1.5 mb-6">
                    <span className={`text-4xl lg:text-5xl font-light tracking-tight ${isPremium ? 'text-white' : 'text-gray-100'}`}>
                      {tier.price}
                    </span>
                    <span className={`text-[10px] ${isPremium ? 'text-gray-300' : 'text-gray-500'}`}>{tier.duration}</span>
                  </div>

                  <ul className={`space-y-3 mb-8 flex-1 text-xs leading-relaxed ${isPremium ? 'text-gray-200' : 'text-gray-400'}`}>
                    {tier.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <span className={`mt-1 text-[8px] ${isPremium ? 'text-white opacity-80' : 'text-gray-500'}`}>
                          {isPremium ? '✦' : '✧'}
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* 按钮居中 */}
                  <div className="w-full flex justify-center mt-auto">
                    <button className={`w-full max-w-[220px] py-3 rounded-md text-sm font-medium tracking-wide transition-all duration-300 relative overflow-hidden ${
                      isPremium 
                        ? 'bg-white text-black hover:bg-gray-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}>
                      {isPremium && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                      )}
                      {tier.button}
                    </button>
                  </div>
                </div>
              </GlassPanel>
            </div>
          );
        })}
        
      </div>
    </section>
  );
}

/**
 * GlassPanel — 统一的白色亮色玻璃封装
 */
function GlassPanel({ isMobile, variant, children }) {
  const isPremium = variant === 'premium';
  const glassProps = isPremium ? PREMIUM_GLASS : PANEL_GLASS_BASE;
  const cssClass = `consultants-white-glass ${isPremium ? 'consultants-white-glass--premium' : ''} h-full`;

  if (isMobile) {
    return (
      <div className={cssClass}>
        {children}
      </div>
    );
  }

  return (
    <LiquidGlass
      {...glassProps}
      className={cssClass}
    >
      {children}
    </LiquidGlass>
  );
}
