import { useState, useEffect } from "react";
import { FiHome, FiTrendingUp, FiPlus, FiArrowRight, FiMapPin, FiCamera } from "react-icons/fi";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../../shared/utils/api";

const Properties = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        pending: 0,
        views: '1.2k' // Mocked for now
    });

    useEffect(() => {
        // Fetch stats from API in real implementation
    }, []);

    const statCards = [
        { label: "Total Commercial", value: stats.total, icon: FiHome, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Active Listings", value: stats.active, icon: FiTrendingUp, color: "text-green-600", bg: "bg-green-100" },
        { label: "Total Views", value: stats.views, icon: FiCamera, color: "text-purple-600", bg: "bg-purple-100" },
    ];

    const quickActions = [
        { title: "List New Commercial", desc: "Add a new commercial or residential listing", icon: FiPlus, path: "/b2b-vendor/properties/add-commercial" },
        { title: "Manage Listings", desc: "Edit, deactivate or remove your properties", icon: FiHome, path: "/b2b-vendor/properties/manage-properties" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Commercial Portfolio</h1>
                    <p className="text-gray-500 font-medium">Manage your real estate listings and lead generation.</p>
                </div>
                <button
                    onClick={() => navigate("/b2b-vendor/properties/add-commercial")}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                    <FiPlus /> New Commercial
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -5 }}
                            className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-5"
                        >
                            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center text-2xl shadow-inner`}>
                                <Icon />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                                <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quickActions.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={idx}
                            onClick={() => navigate(action.path)}
                            className="group bg-white p-8 rounded-[3rem] border-2 border-transparent hover:border-slate-800 transition-all text-left shadow-sm relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                    <Icon size={24} />
                                </div>
                                <h4 className="text-xl font-black text-slate-800 mb-2">{action.title}</h4>
                                <p className="text-sm text-gray-400 font-medium pr-12">{action.desc}</p>
                                <div className="absolute right-8 bottom-8 group-hover:right-6 transition-all">
                                    <FiArrowRight size={24} className="text-slate-300 group-hover:text-slate-800" />
                                </div>
                            </div>
                            {/* Abstract Background Design */}
                            <div className="absolute -right-4 -top-4 w-32 h-32 bg-slate-50 rounded-full group-hover:bg-slate-100 transition-all" />
                        </button>
                    );
                })}
            </div>

            {/* Recent Leads / Performance Section Placeholder */}
            <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Market Insights</h3>
                    <div className="flex items-center gap-2 text-primary-600 font-bold text-sm cursor-pointer hover:underline">
                        View Detailed Analytics <FiArrowRight />
                    </div>
                </div>
                <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                    <div className="text-center">
                        <FiTrendingUp className="text-slate-200 text-5xl mx-auto mb-2" />
                        <p className="text-slate-400 font-medium">Detailed performance charts will appear here</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Properties;
