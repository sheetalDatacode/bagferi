export const dashboardMockData = {
    summary: [
        { label: "Total Vendors", value: "1,248", trend: "+12%", trendType: "up", icon: "FiUsers", color: "blue" },
        { label: "Active Vendors", value: "1,180", trend: "+5%", trendType: "up", icon: "FiUserCheck", color: "green" },
        { label: "Total Products", value: "45,200", trend: "+18%", trendType: "up", icon: "FiPackage", color: "purple" },
        { label: "Total Properties", value: "8,450", trend: "+8%", trendType: "up", icon: "FiHome", color: "orange" },
        { label: "Active Subs", value: "945", trend: "+2%", trendType: "up", icon: "FiZap", color: "indigo" },
        { label: "Live Banners", value: "156", trend: "-3%", trendType: "down", icon: "FiImage", color: "pink" },
    ],
    vendorDistribution: [
        { name: 'Retail/Wholesale', value: 450, color: '#3B82F6' },
        { name: 'Fresh/Lot/Slot', value: 320, color: '#10B981' },
        { name: 'Builder/Developer', value: 280, color: '#F59E0B' },
        { name: 'Broker', value: 198, color: '#8B5CF6' },
    ],
    subscriptions: {
        product: { active: 450, expired: 45, expiringSoon: 28 },
        property: { active: 320, expired: 32, expiringSoon: 15 },
        banner: { active: 175, expired: 12, expiringSoon: 8 }
    },
    listingHealth: {
        products: { total: 45200, approved: 42100, pending: 2500, disabled: 600 },
        properties: { total: 8450, approved: 7800, pending: 450, disabled: 200 }
    },
    banners: {
        productBanners: 92,
        propertyBanners: 64,
        expiring7Days: 14
    },
    interactions: {
        totalCalls: "12,450",
        totalWhatsApp: "8,920",
        topVendors: [
            { name: "Super Mart Wholesale", calls: 450, wp: 320 },
            { name: "Green Valley Builders", calls: 380, wp: 290 },
            { name: "Lotus Real Estate", calls: 310, wp: 210 },
            { name: "City Heights Developers", calls: 290, wp: 180 },
            { name: "Mega Slot Traders", calls: 240, wp: 150 },
        ]
    },
    performance: {
        topCategories: [
            { name: "Electronics", views: 45000 },
            { name: "Construction Material", views: 38000 },
            { name: "Fashion & Apparel", views: 32000 },
            { name: "Home Appliances", views: 28000 },
            { name: "Auto Parts", views: 24000 },
        ],
        topLocations: [
            { name: "Delhi NCR", views: 52000 },
            { name: "Mumbai South", views: 48000 },
            { name: "Bangalore East", views: 41000 },
            { name: "Pune Center", views: 35000 },
            { name: "Ahmedabad", views: 29000 },
        ]
    },
    alerts: [
        { type: "expired_sub", message: "12 Vendors have expired subscriptions", severity: "high" },
        { type: "pending_product", message: "2,500 Products waiting for approval", severity: "medium" },
        { type: "pending_property", message: "450 Properties waiting for approval", severity: "medium" },
        { type: "expiring_banner", message: "8 Banners expiring in next 48 hours", severity: "low" },
    ]
};
