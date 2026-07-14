import { useLocation } from 'react-router-dom';

/**
 * Wrapper component that forces remounting when location changes
 * This ensures React Router properly updates components on navigation
 */
const RouteWrapper = ({ children }) => {
  const location = useLocation();
  
  // Return children with location key to force remount on route change
  // Using a div with no styling to avoid layout interference
  return <div key={location.pathname + location.search} style={{ width: '100%', height: '100%' }}>{children}</div>;
};

export default RouteWrapper;

