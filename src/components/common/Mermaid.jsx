import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark', // or customize further based on Vennai theme
  fontFamily: 'Inter, sans-serif'
});

export default function Mermaid({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && chart) {
      const id = `mermaid-${Math.random().toString(36).substring(7)}`;
      mermaid.render(id, chart).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      }).catch(e => {
        console.error("Mermaid render error:", e);
      });
    }
  }, [chart]);

  return <div className="mermaid-container flex justify-center my-8 overflow-x-auto p-4 bg-white/5 rounded-xl border border-white/10" ref={ref} />;
}
