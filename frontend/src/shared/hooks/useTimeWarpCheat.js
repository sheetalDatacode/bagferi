import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

/**
 * Hook to listen for secret key sequences and trigger time warp
 * 
 * Sequence: T-E-S-T (Warp +7 days)
 * Sequence: R-E-S-E-T (Reset to 0)
 */
export const useTimeWarpCheat = () => {
    const sequence = useRef('');
    const timeout = useRef(null);

    useEffect(() => {
        const handleKeyDown = async (e) => {
            // Clear existing timeout
            if (timeout.current) clearTimeout(timeout.current);

            // Append key to sequence (case insensitive) if e.key exists
            if (e.key) {
                sequence.current += e.key.toUpperCase();
            }

            // Reset sequence after 2 seconds of inactivity
            timeout.current = setTimeout(() => {
                sequence.current = '';
            }, 2000);

            // Check for sequences
            if (sequence.current.endsWith('TEST')) {
                sequence.current = '';
                try {
                    const res = await api.post('/dev/time/warp', { days: 7 });
                    if (res.success) {
                        toast.success('🕒 TIME WARPED: +7 Days! Return windows have shifted.', {
                            duration: 5000,
                            icon: '⏳'
                        });
                    }
                } catch (error) {
                    console.error('Time warp failed:', error);
                    toast.error('Time warp failed');
                }
            } else if (sequence.current.endsWith('RESET')) {
                sequence.current = '';
                try {
                    const res = await api.post('/dev/time/reset');
                    if (res.success) {
                        toast.success('🕒 TIME RESET: Back to reality.', {
                            duration: 5000,
                            icon: '🔄'
                        });
                    }
                } catch (error) {
                    console.error('Time reset failed:', error);
                    toast.error('Time reset failed');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
};
