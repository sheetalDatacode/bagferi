import { useEffect, useState, useRef } from "react";
import { FiSearch, FiEye, FiUser, FiMapPin, FiChevronDown, FiX, FiTrash2, FiAlertTriangle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DataTable from "../components/DataTable";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";
import { useScrollLock } from "../../../shared/hooks/useScrollLock";

const UserDetailsModal = ({ isOpen, onClose, user }) => {
  useScrollLock(isOpen);
  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                <FiUser />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                  User Details
                </h2>
                <p className="text-xs text-gray-500">
                  #{user._id?.slice(-8)} &middot;{" "}
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <section>
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-50 pb-1">
                  Registration Info
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Name</p>
                    <p className="font-bold text-gray-800">{user.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                    <p className="font-bold text-gray-800 break-all">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Phone</p>
                    <p className="font-bold text-gray-800">{user.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">City</p>
                    <p className="font-bold text-gray-800">{user.businessInfo?.address?.city || "N/A"}</p>
                  </div>
                </div>
              </section>

              {user.businessInfo && (user.businessInfo.companyName || user.businessInfo.gstNumber || user.businessInfo.address?.fullAddress) && (
                <section>
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-50 pb-1">
                    Business Details (Self-Provided)
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {user.businessInfo.companyName && (
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Company</p>
                          <p className="font-bold text-gray-800">{user.businessInfo.companyName}</p>
                        </div>
                      )}
                      {user.businessInfo.gstNumber && (
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">GSTIN</p>
                          <p className="font-bold text-gray-800 uppercase">{user.businessInfo.gstNumber}</p>
                        </div>
                      )}
                      {user.businessInfo.companyType && user.businessInfo.companyType !== 'Retailer' && (
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Business Type</p>
                          <p className="font-bold text-gray-800">{user.businessInfo.companyType}</p>
                        </div>
                      )}
                      {user.businessInfo.industry && user.businessInfo.industry !== 'General Trade' && (
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Industry</p>
                          <p className="font-bold text-gray-800">{user.businessInfo.industry}</p>
                        </div>
                      )}
                    </div>

                    {user.businessInfo.address?.fullAddress && (
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Registered Address</p>
                        <p className="text-xs font-bold text-gray-700 leading-relaxed">
                          {user.businessInfo.address.fullAddress}
                          {(user.businessInfo.address.state || user.businessInfo.address.pincode) && (
                            <span className="block mt-1 text-gray-500 font-medium">
                              {user.businessInfo.address.state} {user.businessInfo.address.pincode ? ` - ${user.businessInfo.address.pincode}` : ''}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {Array.isArray(user.addresses) && user.addresses.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-50 pb-1">
                    Additional Delivery Addresses
                  </h3>
                  <div className="space-y-2">
                    {user.addresses.map((addr, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-xs">
                        <p className="font-bold text-gray-800 flex items-center gap-2">
                          {addr.addressType || "Address"}
                          {addr.isDefault && (
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Default</span>
                          )}
                        </p>
                        <p className="text-gray-500 mt-0.5 font-medium">
                          {addr.streetAddress}, {addr.city}, {addr.state} {addr.pincode}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-gray-900 text-white hover:bg-black"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, userName, isLoading }) => {
  useScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-6">
                <FiAlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">
                Delete User?
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed px-4">
                Are you sure you want to delete <span className="font-bold text-gray-800">{userName}</span>? This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-2xl bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Delete User"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [citySearchInput, setCitySearchInput] = useState("");
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [citiesList, setCitiesList] = useState([]);
  const cityDropdownRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCities = async () => {
    try {
      const res = await api.get("/admin/users/cities");
      if (res?.success && Array.isArray(res.data)) setCitiesList(res.data);
    } catch { setCitiesList([]); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users", {
        params: {
          page: 1,
          limit: 100,
          search: searchQuery || "",
          city: selectedCity || undefined,
        },
      });
      if (response?.success) {
        setUsers(response.data || response.users || []);
      } else {
        toast.error(response?.message || "Failed to load users");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load users from server",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target)) setCitiesOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleView = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/admin/users/${userToDelete._id}`);
      if (res.success) {
        toast.success(res.message || "User deleted successfully");
        setUsers(users.filter((u) => u._id !== userToDelete._id));
        setIsDeleteModalOpen(false);
      } else {
        toast.error(res.message || "Failed to delete user");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const columns = [
    {
      key: "name",
      label: "User",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <FiUser />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {val || "N/A"}
            </p>
            <p className="text-[11px] text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
    },
    {
      key: "isEmailVerified",
      label: "Email Status",
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${val
              ? "bg-green-100 text-green-700"
              : "bg-orange-100 text-orange-700"
            }`}
        >
          {val ? "Verified" : "Pending"}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Account",
      render: (val) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${val ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
            }`}
        >
          {val ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined On",
      render: (val) =>
        val ? new Date(val).toLocaleDateString("en-IN") : "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View user details"
          >
            <FiEye />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete user"
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center gap-3">

        <div className="relative" ref={cityDropdownRef}>
          <div
            onClick={() => setCitiesOpen(!citiesOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 min-w-[160px]"
          >
            <FiMapPin className="text-gray-400 flex-shrink-0" size={16} />
            <span className="text-sm font-medium text-gray-700 truncate flex-1">
              {selectedCity || "Filter by City"}
            </span>
            {selectedCity && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedCity(""); setCitiesOpen(false); }}
                className="p-0.5 rounded hover:bg-gray-100"
              >
                <FiX size={14} className="text-gray-500" />
              </button>
            )}
            <FiChevronDown className={`text-gray-400 transition-transform ${citiesOpen ? "rotate-180" : ""}`} size={14} />
          </div>
          <AnimatePresence>
            {citiesOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-hidden"
              >
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    placeholder="Search city..."
                    value={citySearchInput}
                    onChange={(e) => setCitySearchInput(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="overflow-y-auto max-h-44 py-1">
                  {citiesList
                    .filter((c) =>
                      (citySearchInput || "").trim()
                        ? String(c).toLowerCase().includes(citySearchInput.toLowerCase())
                        : true
                    )
                    .map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city);
                          setCitySearchInput("");
                          setCitiesOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 ${selectedCity === city ? "bg-primary-50 text-primary-700 font-semibold" : "text-gray-700"}`}
                      >
                        {city}
                      </button>
                    ))}
                  {citiesList.filter((c) =>
                    (citySearchInput || "").trim()
                      ? String(c).toLowerCase().includes(citySearchInput.toLowerCase())
                      : true
                  ).length === 0 && (
                      <p className="px-4 py-3 text-xs text-gray-400">No cities match</p>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <form onSubmit={handleSearch} className="relative w-full sm:w-auto sm:min-w-[220px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-primary-500 outline-none text-sm"
          />
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Loading users...
            </p>
          </div>
        ) : users.length > 0 ? (
          <DataTable
            data={users}
            columns={columns}
            pagination={true}
            itemsPerPage={10}
          />
        ) : (
          <div className="py-12 text-center text-gray-500 text-sm">
            No users found.
          </div>
        )}
      </div>

      <UserDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
          }
        }}
        onConfirm={confirmDelete}
        userName={userToDelete?.name || userToDelete?.email}
        isLoading={isDeleting}
      />

    </motion.div>
  );
};

export default UserManagement;

