import React, { useRef, useEffect } from 'react';
import styles from './Sidebar.module.css';

/**
 * A self-contained, reusable sidebar component with independent scrolling.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The scrollable content (e.g., categories)
 * @param {React.ReactNode} [props.header] - Fixed header element
 * @param {React.ReactNode} [props.footer] - Fixed footer element
 * @param {string} [props.width='80px'] - Sidebar width
 * @param {string} [props.className=''] - Additional container classes
 * @param {React.RefObject} [props.scrollRef] - External ref for the scrollable area
 */
const Sidebar = ({ 
  children, 
  header, 
  footer, 
  width = '80px', 
  className = '',
  scrollRef: externalScrollRef
}) => {
  const internalScrollRef = useRef(null);
  const scrollRef = externalScrollRef || internalScrollRef;

  // Optimize scroll performance
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Efficient scroll handling if needed in future
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  return (
    <div 
      className={`${styles.sidebarContainer} ${className}`} 
      style={{ width }}
    >
      {header && (
        <div className={styles.fixedHeader}>
          {header}
        </div>
      )}

      <div 
        ref={scrollRef} 
        className={styles.scrollableContent}
      >
        {children}
      </div>

      {footer && (
        <div className={styles.fixedFooter}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
