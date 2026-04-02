import { useLanguage } from '../../../../context/useLanguage';

/**
 * Project Ω Manifesto — 占位文章组件
 *
 * 状态: 站位用，内容待补充
 */

function EnglishContent() {
  return (
    <>
      <h2 className="blog-h2">Coming Soon</h2>
      <p className="blog-p">
        The full Project Ω manifesto is being written. Check back soon.
      </p>
    </>
  );
}

function ChineseContent() {
  return (
    <>
      <h2 className="blog-h2">即将发布</h2>
      <p className="blog-p">
        Project Ω 完整宣言正在撰写中，敬请期待。
      </p>
    </>
  );
}

export default function ProjectOmegaArticle() {
  const { lang } = useLanguage();
  return lang === 'zh' ? <ChineseContent /> : <EnglishContent />;
}
