import { useNavigate } from "react-router-dom";
import { FiEye, FiFileText, FiTruck, FiTrash2 } from "react-icons/fi";
import { formatCurrency } from "./adminHelpers";
import Badge from "../../../shared/components/Badge";

export const getOrderColumns = (handlers) => {
    const {
        handleOrderDetails,
        handleViewPage,
        handleGenerateInvoice,
        handleOrderTracking,
        handleDeleteOrder,
        calculateFinalTotal
    } = handlers;

    return [
        {
            key: "orderCode",
            label: "Order ID",
            sortable: true,
            render: (value, row) => {
                const orderId = row._id || row.id || row.orderCode;
                return (
                    <button
                        onClick={() => handleViewPage(orderId)}
                        className="font-semibold text-primary-600 hover:text-primary-700 hover:underline text-left"
                    >
                        {value || row.id || row._id}
                    </button>
                );
            },
        },
        {
            key: "customer",
            label: "Customer",
            sortable: true,
            render: (value, row) => {
                const customer = row.customerSnapshot || row.customerId || value || {};
                const name = customer.name || (typeof customer === 'string' ? 'User' : 'Guest');
                const email = customer.email || '';
                return (
                    <div>
                        <p className="font-medium text-gray-800">{name}</p>
                        <p className="text-xs text-gray-500">{email}</p>
                    </div>
                );
            },
        },
        {
            key: "vendor",
            label: "Vendor",
            sortable: false,
            render: (_, row) => {
                const vendors = row.vendorItems || [];
                if (vendors.length === 0) return <span className="text-gray-400">N/A</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        {vendors.map((v, i) => (
                            <p key={i} className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                                {v.vendorName}
                            </p>
                        ))}
                    </div>
                );
            },
        },
        {
            key: "items",
            label: "Items",
            sortable: false,
            render: (value) => (
                <span className="text-gray-700">
                    {Array.isArray(value) ? `${value.length} items` : (typeof value === 'number' ? `${value} items` : '0 items')}
                </span>
            ),
        },
        {
            key: "reason",
            label: "Cancel Reason",
            sortable: false,
            render: (_, row) => {
                const reason = row.cancellation?.reason || row.statusHistory?.find(h => h.status === 'cancelled')?.note;
                if (row.status !== 'cancelled' || !reason) return <span className="text-gray-400">-</span>;
                return (
                    <div className="max-w-[150px]">
                        <p className="text-xs text-red-600 font-medium line-clamp-2 italic" title={reason}>
                            {reason}
                        </p>
                    </div>
                );
            }
        },
        {
            key: "finalTotal",
            label: "Total ($)",
            sortable: true,
            render: (value, row) => {
                const finalTotal = row.pricing?.total || row.total || calculateFinalTotal(row);
                return (
                    <span className="font-bold text-gray-800">
                        {formatCurrency(finalTotal)}
                    </span>
                );
            },
        },
        {
            key: "status",
            label: "Status",
            sortable: true,
            render: (value) => (
                <Badge
                    variant={
                        value === "delivered" ? "success" :
                            value === "cancelled" ? "error" :
                                value === "returned" ? "error" : "warning"
                    }
                >
                    {value?.toUpperCase() || "PENDING"}
                </Badge>
            ),
        },
        {
            key: "createdAt",
            label: "Date",
            sortable: true,
            render: (value) => new Date(value).toLocaleDateString(),
        },
        {
            key: "actions",
            label: "Actions",
            sortable: false,
            render: (_, row) => {
                const orderId = row._id || row.id || row.orderCode;
                return (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleOrderDetails(orderId)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Details"
                        >
                            <FiEye />
                        </button>
                        <button
                            onClick={() => handleGenerateInvoice(row)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="Invoice"
                        >
                            <FiFileText />
                        </button>
                        <button
                            onClick={() => handleOrderTracking(orderId)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Tracking"
                        >
                            <FiTruck />
                        </button>
                        <button
                            onClick={() => handleDeleteOrder(orderId)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete"
                        >
                            <FiTrash2 />
                        </button>
                    </div>
                );
            },
        },
    ];
};
