import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export default function ArticleReadingTools() {
  const location = useLocation();
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    let frame = 0;

    const setup = () => {
      const article = document.querySelector('.article-body');
      if (!article) {
        setSections([]);
        setProgress(0);
        return;
      }

      const headings = [...article.querySelectorAll('h2')];
      const nextSections = headings.map((heading, index) => {
        const id = heading.id || `article-section-${index + 1}`;
        heading.id = id;
        return { id, label: heading.textContent.trim() };
      }).filter((section) => section.label);
      setSections(nextSections);

      const updateProgress = () => {
        frame = 0;
        const top = window.scrollY + article.getBoundingClientRect().top;
        const bottom = top + article.offsetHeight - window.innerHeight * 0.72;
        const range = Math.max(1, bottom - top);
        setProgress(clamp((window.scrollY - top + 80) / range));
      };
      const onScroll = () => {
        if (!frame) frame = window.requestAnimationFrame(updateProgress);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      updateProgress();
      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        if (frame) window.cancelAnimationFrame(frame);
      };
    };

    // Let route-specific article content mount before collecting its headings.
    let cleanup = () => {};
    const timer = window.setTimeout(() => {
      cleanup = setup() || cleanup;
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cleanup();
    };
  }, [location.pathname, location.search]);

  if (!sections.length) return null;

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOpen(false);
  };

  return (
    <>
      <div className="article-reading-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <aside className={`article-toc${open ? ' is-open' : ''}`} aria-label="Sommaire de l’article">
        <button
          type="button"
          className="article-toc-toggle"
          aria-expanded={open}
          aria-controls="article-toc-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="article-toc-toggle-mark" aria-hidden="true">☰</span>
          <span>Sommaire</span>
          <span className="article-toc-count">{sections.length}</span>
        </button>
        <nav id="article-toc-panel" className="article-toc-panel" aria-hidden={!open}>
          <span className="article-toc-kicker">Sur cette page</span>
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}>
                <button type="button" onClick={() => scrollToSection(section.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{section.label}</strong>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </>
  );
}
