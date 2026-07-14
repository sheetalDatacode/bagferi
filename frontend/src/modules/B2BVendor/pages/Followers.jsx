import { useState, useEffect } from "react";
import { FiUsers, FiSearch, FiClock, FiMail, FiPhone, FiUser } from "react-icons/fi";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const Followers = () => {
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchFollowers = async () => {
            try {
                const res = await api.get("/follow/vendor-followers");
                if (res.success) {
                    setFollowers(res.data.followers || []);
                }
            } catch (error) {
                console.error("Error fetching followers:", error);
                toast.error("Failed to load followers list");
            } finally {
                setLoading(false);
            }
        };
        fetchFollowers();
    }, []);

    const filteredFollowers = followers.filter(f => 
        (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Loading your community...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex justify-end w-full">
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search followers..."
                        className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl w-full outline-none focus:border-primary-500 transition-all font-medium text-sm shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Card */}
            <div className="bg-primary-600 rounded-[2rem] p-8 text-white shadow-xl shadow-primary-200 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="relative flex items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-md">
                        <FiUsers size={32} />
                    </div>
                    <div>
                        <p className="text-primary-100 text-xs font-black uppercase tracking-widest mb-1">Total Following Base</p>
                        <h2 className="text-4xl font-black">{followers.length} <span className="text-lg font-medium opacity-80 uppercase tracking-tighter">Followers</span></h2>
                    </div>
                </div>
            </div>

            {filteredFollowers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFollowers.map((follower, idx) => (
                        <motion.div 
                            key={follower._id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all group"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 overflow-hidden border-2 border-white shadow-md flex items-center justify-center text-gray-400">
                                    {follower.avatar ? (
                                        <img src={follower.avatar} alt={follower.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <FiUser size={24} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{follower.name || 'Anonymous User'}</h3>
                                    <div className="flex items-center gap-1.5 text-gray-400 mt-0.5">
                                        <FiClock size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                            Followed {follower.followedAt ? new Date(follower.followedAt).toLocaleDateString() : 'recently'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {follower.email && (
                                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500 p-3 bg-gray-50 rounded-xl">
                                        <FiMail className="text-primary-600 flex-shrink-0" />
                                        <span className="truncate">{follower.email}</span>
                                    </div>
                                )}
                                {follower.phone && (
                                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500 p-3 bg-gray-50 rounded-xl">
                                        <FiPhone className="text-green-600 flex-shrink-0" />
                                        <span>+91 {follower.phone}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] p-16 text-center border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-200">
                        <FiUsers size={40} />
                    </div>
                    <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">No followers yet</h3>
                    <p className="text-gray-400 max-w-sm mx-auto mt-2 text-sm font-medium">Start uploading reels and promoting your store to build your dealing India community.</p>
                </div>
            )}
        </div>
    );
};

export default Followers;
