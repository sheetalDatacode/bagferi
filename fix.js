const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/HP/Desktop/appzeto_first/Bagferi/frontend/src/modules/B2BUserApp/pages/B2BLanding.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// The file currently has this section mangled into:
//         // Force refresh once to migrate location data format from strings to objects
//             return true;
//         });
//     }, [allVendors]);
// 
//     // Auto-scroll logic for Premium Suppliers that allows manual scrolling

const searchStr = `        // Force refresh once to migrate location data format from strings to objects
            return true;
        });
    }, [allVendors]);

    // Auto-scroll logic for Premium Suppliers that allows manual scrolling`;

const replacementStr = `        // Force refresh once to migrate location data format from strings to objects
        fetchLocations(true);

        const fetchBusinessTypes = async () => {
            try {
                const response = await api.get('/business-types');
                if (response.success) {
                    setBusinessTypes(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching business types:', error);
            }
        };

        const fetchAllVendors = async () => {
            try {
                setVendorsLoading(true);
                const params = { limit: 50, vendorType: 'b2b', nocache: 1 };
                if (selectedCity && selectedCity !== 'All Cities') {
                    params.city = selectedCity;
                }
                const response = await api.get('/vendors', { params });
                if (response.success && response.data) {
                    const vendorData = Array.isArray(response.data) ? response.data : (response.data.vendors || []);
                    setAllVendors(vendorData);
                }
            } catch (error) {
                console.error('Error fetching vendors:', error);
            } finally {
                setVendorsLoading(false);
            }
        };

        const fetchSuggestedProducts = async () => {
            try {
                const params = { limit: 10, vendorType: 'b2b' };
                if (selectedCity && selectedCity !== 'All Cities') {
                    params.city = selectedCity;
                }
                const response = await api.get('/products', { params });
                if (response.success && response.data) {
                    const products = Array.isArray(response.data) ? response.data : (response.data.products || []);
                    setSuggestedProducts(products);
                }
            } catch (error) {
                console.error('Error fetching suggested products:', error);
            }
        };

        const fetchLiveReels = async () => {
            try {
                const response = await api.get('/reels/feed', { params: { limit: 10 } });
                if (response.success && response.data) {
                    const reels = Array.isArray(response.data) ? response.data : (response.data.reels || []);
                    setLiveReels(reels);
                }
            } catch (error) {
                console.error('Error fetching reels:', error);
            }
        };

        fetchBusinessTypes();
        fetchAllVendors();
        fetchSuggestedProducts();
        fetchLiveReels();
    }, [fetchCategories, fetchLocations, selectedCity]);

    // Effect to calculate header height dynamically
    useEffect(() => {
        const updateHeight = () => {
            const header = headerRef.current;
            const toolbar = toolbarRef.current;

            if (header) {
                setHeaderHeight(header.offsetHeight);
            }
        };

        // Initial update with small delay for layout stabilization
        const timer = setTimeout(updateHeight, 150);

        window.addEventListener('resize', updateHeight);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    // Only show vendors that have a shop (shopUnit) in the strip; dedupe by id so same card never appears twice
    const vendorsWithShop = useMemo(() => {
        const withShop = (allVendors || []).filter((v) => v && v.shopUnit != null && (typeof v.shopUnit === 'object' ? Object.keys(v.shopUnit).length > 0 : true));
        const seen = new Set();
        return withShop.filter((v) => {
            const id = (v._id || v.id || '').toString();
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    }, [allVendors]);

    // Auto-scroll logic for Premium Suppliers that allows manual scrolling`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replacementStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Successfully replaced and restored file.");
} else {
    console.log("Could not find the target string!");
}
