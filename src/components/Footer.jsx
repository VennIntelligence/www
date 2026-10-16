import { COPY } from '../config/i18n';
import { useLanguage } from '../context/useLanguage';
import { IconEmail, IconX } from './common/SocialIcons';
import '../styles/components/footer.css';

/**
 * Footer — 全局页脚组件
 * 包含公司信息、社交链接、导航快捷入口
 */
export default function Footer() {
  const { lang } = useLanguage();
  const copy = COPY.footer[lang];
  const isChinese = lang === 'zh';
  const sloganLines = COPY.hero[lang].subtitleLines;

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__left">
          <p className="footer__company">
            {copy.company}
            <span className="footer__meta">{copy.companyMeta}</span>
          </p>
          <p className="footer__desc">
            {isChinese
              ? sloganLines.map((line) => <span key={line} className="footer__desc-line">{line}</span>)
              : sloganLines.join(' ')}
          </p>
        </div>

        <div className="footer__links">
          <div className="footer__social-links">
            <a href="mailto:contact@vennai.org" className="footer__link footer__link--icon">
              <IconEmail className="footer__link-icon" />
              {copy.email}
            </a>
            <a href="https://x.com/venn_foundation" target="_blank" rel="noopener noreferrer" className="footer__link footer__link--icon">
              <IconX className="footer__link-icon" />
              {copy.twitter}
            </a>
          </div>
        </div>

        <div className="footer__right">
          <span className="footer__copy">{copy.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
