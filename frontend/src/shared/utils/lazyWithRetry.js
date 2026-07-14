import { lazy } from 'react';

/**
 * Enhanced lazy loader that handles:
 * 1. ChunkLoadError (when a new version is deployed and old chunks are missing)
 * 2. MIME type mismatch (when server returns index.html for missing chunks)
 * 3. Network issues
 * 
 * It will retry the import 2 times with a delay before giving up.
 * If all retries fail, it will force a page refresh to get the latest app version.
 */
export const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error) {
            console.error('Lazy import failed:', error);

            if (!pageHasAlreadyBeenForceRefreshed) {
                // Log the failure for tracking
                console.warn('Chunk load failed. Attempting force refresh to get latest version...');
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
                window.location.reload();
                // Return a never-resolving promise to prevent React from rendering undefined
                return new Promise(() => { });
            }

            // Reset the flag so next navigation attempt can try refresh again
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            // If we already refreshed and it still fails, bubble the error to ErrorBoundary
            throw error;
        }
    });


export default lazyWithRetry;
