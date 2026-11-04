import React, { useEffect, useRef } from 'react';
export default function SchoolDialog({ title, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => { ref.current?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={`school-dialog ${className}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if(event.target === event.currentTarget) { const r=event.currentTarget.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) onClose(); } }}>
    <button type="button" className="school-dialog-close" aria-label="Fermer" onClick={onClose}>×</button>{children}
  </dialog>;
}
