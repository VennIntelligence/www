import { useEffect } from 'react';
import UnifiedStage from '../components/UnifiedStage';
import ScrollDownArrow from '../components/ScrollDownArrow';
import HeroSection from './home/HeroSection';
import SigmaSection from './home/SigmaSection';
import OmegaSection from './home/OmegaSection';
import ConsultantsSection from './home/ConsultantsSection';
import Footer from '../components/Footer';

/**
 * HomePage — Landing Page 组装器
 * 将所有 Section 组合为一个单页滚动体验
 * UnifiedStage 作为全屏固定渲染层（液滴 + 玻璃立方体）
 */
export default function HomePage() {
  useEffect(() => {
    document.documentElement.classList.add('home-page-scroll-snap');
    document.body.classList.add('home-page-scroll-snap');

    return () => {
      document.documentElement.classList.remove('home-page-scroll-snap');
      document.body.classList.remove('home-page-scroll-snap');
    };
  }, []);

  return (
    <main className="home-page">
      <UnifiedStage />
      <ScrollDownArrow />
      <HeroSection />
      <SigmaSection />
      <OmegaSection />
      <ConsultantsSection>
        <Footer />
      </ConsultantsSection>
    </main>
  );
}
