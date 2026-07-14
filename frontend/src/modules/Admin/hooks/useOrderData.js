import { useState, useMemo, useEffect, useCallback } from "react";
import { getAdminOrders } from "../../../shared/services/orderService";
import { formatCurrency } from "../utils/adminHelpers";
import toast from "react-hot-toast";

export const useOrderData = (initialStatus = "all") => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState(initialStatus);
    const [dateRange, setDateRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        total: 0,
    });

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const filters = {
                status: selectedStatus === "all" ? undefined : selectedStatus,
                search: searchQuery || undefined,
                startDate: dateRange.startDate || undefined,
                endDate: dateRange.endDate || undefined,
                page: pagination.page,
                limit: 50,
            };

            const response = await getAdminOrders(filters);

            // Handle potentially wrapped or unwrapped response
            const data = response?.data || response;
            const ordersData = data?.orders || response?.orders || [];

            // Extract pagination data safely
            const respPage = data?.page || response?.page || 1;
            const respTotal = data?.total || response?.total || 0;
            const respTotalPages = data?.totalPages || response?.totalPages || 1;

            setOrders(Array.isArray(ordersData) ? ordersData : []);

            // Only update pagination if values actually changed to avoid re-render loops
            setPagination(prev => {
                if (prev.page === respPage && prev.total === respTotal && prev.totalPages === respTotalPages) {
                    return prev;
                }
                return {
                    page: respPage,
                    total: respTotal,
                    totalPages: respTotalPages
                };
            });
        } catch (error) {
            console.error("Error fetching orders:", error);
            // toast.error("Failed to load orders"); // Disabled to prevent toast spam during loops
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [selectedStatus, searchQuery, dateRange.startDate, dateRange.endDate, pagination.page]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const calculateFinalTotal = useCallback((order) => {
        if (!order) return 0;
        if (order.pricing?.total !== undefined) return order.pricing.total;
        if (order.finalTotal !== undefined) return order.finalTotal;
        const total = order.total || 0;
        const tax = (order.pricing?.tax || order.tax || 0);
        const discount = (order.pricing?.discount || order.discount || 0);
        return total + tax - discount;
    }, []);

    const stats = useMemo(() => {
        const count = orders.length;
        const revenue = orders.reduce((sum, o) => sum + (calculateFinalTotal(o) || 0), 0);
        const itemsCount = orders.reduce((sum, o) => {
            const items = Array.isArray(o.items) ? o.items.length : (typeof o.items === 'number' ? o.items : 0);
            return sum + items;
        }, 0);
        const aov = count > 0 ? revenue / count : 0;

        return { count, revenue, itemsCount, aov };
    }, [orders, calculateFinalTotal]);

    return {
        orders,
        loading,
        searchQuery,
        setSearchQuery,
        dateRange,
        setDateRange,
        pagination,
        setPagination,
        stats,
        refetch: fetchOrders,
        calculateFinalTotal
    };
};
