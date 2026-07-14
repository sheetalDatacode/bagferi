import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';

// Animation disabled to prevent "white screen" flash and provide instant feedback
const pageVariants = {
  initial: (direction) => ({
    opacity: 1,
    x: 0,
    y: 0,
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0
  }
};

const pageTransition = {
  type: 'tween',
  duration: 0
};

/**
 * Page transition wrapper
 * Animations have been disabled to ensure instant page rendering without white flashes
 */
const PageTransition = ({ children, className = "" }) => {
  const location = useLocation();
  const [direction, setDirection] = useState('none');
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Determine direction based on path changes
  useEffect(() => {
    const pathDepth = (path) => path.split('/').filter(Boolean).length;
    const currentDepth = pathDepth(location.pathname);
    const previousDepth = pathDepth(prevPath);

    if (currentDepth > previousDepth) {
      setDirection('forward');
    } else if (currentDepth < previousDepth) {
      setDirection('back');
    } else {
      setDirection('none');
    }

    setPrevPath(location.pathname);
  }, [location.pathname, prevPath]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Memoize the unique key to ensure it updates when location changes
  const uniqueKey = useMemo(() => location.pathname + location.search, [location.pathname, location.search]);

  // Use a regular div with key to ensure proper remounting, then wrap with motion
  // This prevents motion.div from interfering with React Router's remounting mechanism
  return (
    <div key={uniqueKey} className={`w-full ${className}`}>
      <motion.div
        custom={direction}
        initial="initial"
        animate="animate"
        variants={pageVariants}
        transition={pageTransition}
        style={{ willChange: 'auto', transform: 'none' }}
        className={`w-full ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PageTransition;
