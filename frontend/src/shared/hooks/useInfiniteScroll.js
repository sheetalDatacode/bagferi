import { useState, useEffect, useCallback, useRef } from 'react';

const useInfiniteScroll = (items, itemsPerPage = 12, initialCount = 12) => {
  const [displayedItems, setDisplayedItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const prevItemsLengthRef = useRef(items?.length || 0);
  const prevInitialCountRef = useRef(initialCount);

  // Reset when items change (compare by length to avoid infinite loops from new array references)
  useEffect(() => {
    const itemsLength = items?.length || 0;
    const itemsChanged = itemsLength !== prevItemsLengthRef.current || initialCount !== prevInitialCountRef.current;
    
    if (itemsChanged && items) {
      prevItemsLengthRef.current = itemsLength;
      prevInitialCountRef.current = initialCount;
      setDisplayedItems(items.slice(0, initialCount));
      setHasMore(itemsLength > initialCount);
    }
  }, [items, initialCount]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const currentCount = displayedItems.length;
      const nextCount = currentCount + itemsPerPage;
      const newItems = items.slice(0, nextCount);
      
      setDisplayedItems(newItems);
      setHasMore(nextCount < items.length);
      setIsLoading(false);
    }, 300);
  }, [items, displayedItems.length, itemsPerPage, hasMore, isLoading]);

  // Intersection Observer for automatic loading
  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [target] = entries;
        if (target.isIntersecting) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
      observer.disconnect();
    };
  }, [hasMore, isLoading, loadMore]);

  return {
    displayedItems,
    hasMore,
    isLoading,
    loadMore,
    loadMoreRef,
  };
};

export default useInfiniteScroll;

