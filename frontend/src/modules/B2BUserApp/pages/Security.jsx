import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiLock, FiSmartphone, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';

const Security = () => {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <B2BHeader title="Security" showBack={true} />

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Security Score Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Security Score</p>
                            <h2 className="text-3xl font-black">Strong</h2>
                            <p className="text-sm text-blue-100 mt-2 opacity-80">Your account is well protected.</p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                            <FiShield size={32} />
                        </div>
                    </div>
                </motion.div>

                {/* Password Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FiLock className="text-primary-500" />
                        Password & Login
                    </h3>

                    <button className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-gray-100 transition-colors">
                        <div className="text-left">
                            <p className="font-bold text-gray-800 text-sm">Change Password</p>
                            <p className="text-xs text-gray-500 mt-0.5">Last changed 3 months ago</p>
                        </div>
                        <span className="text-xs font-bold text-primary-600 group-hover:underline">Update</span>
                    </button>
                </motion.div>

                {/* 2FA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FiSmartphone className="text-primary-500" />
                            Two-Factor Auth
                        </h3>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <div className="flex-1 pr-4">
                            <p className="font-bold text-gray-800 text-sm">SMS Authentication</p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Receive a code via SMS to verify it's you when logging in.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={twoFactorEnabled}
                                onChange={() => setTwoFactorEnabled(!twoFactorEnabled)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                        </label>
                    </div>

                    {!twoFactorEnabled && (
                        <div className="mt-4 flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium">
                            <FiAlertTriangle className="text-lg flex-shrink-0 mt-0.5" />
                            <p>We highly recommend enabling Two-Factor Authentication to protect your business account.</p>
                        </div>
                    )}
                </motion.div>

                {/* Login Activity */}
                <div className="text-center pt-4">
                    <p className="text-xs text-gray-400">
                        Last login: Today, 10:45 AM from Windows PC (Chrome)
                    </p>
                </div>

            </main>
            <B2BBottomNav />
        </div>
    );
};

export default Security;
