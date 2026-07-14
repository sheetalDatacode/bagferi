import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMusic, FiPlus, FiTrash2, FiPlay, FiPause, FiToggleLeft, FiToggleRight, FiX, FiUploadCloud } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

export default function MusicLibrary() {
    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [playingId, setPlayingId] = useState(null);
    const [audio] = useState(new Audio());

    const [formData, setFormData] = useState({
        title: '',
        artist: '',
        genre: '',
        file: null,
    });

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/music');
            if (res.success) {
                setSongs(res.data.music || []);
            }
        } catch (err) {
            toast.error('Failed to load music library');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSongs();
        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    const handleTogglePlay = (song) => {
        if (playingId === song._id) {
            audio.pause();
            setPlayingId(null);
        } else {
            audio.src = song.fileUrl;
            audio.play();
            setPlayingId(song._id);
        }
    };

    audio.onended = () => setPlayingId(null);

    const handleToggleStatus = async (id) => {
        try {
            const res = await api.patch(`/music/${id}/toggle`);
            if (res.success) {
                toast.success(res.message);
                fetchSongs();
            }
        } catch (err) {
            toast.error(err.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this song?')) return;
        try {
            const res = await api.delete(`/music/${id}`);
            if (res.success) {
                toast.success('Song deleted');
                fetchSongs();
            }
        } catch (err) {
            toast.error(err.message || 'Delete failed');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!formData.file || !formData.title || !formData.artist) {
            return toast.error('Please fill all required fields');
        }

        setUploading(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('artist', formData.artist);
        data.append('genre', formData.genre);
        data.append('file', formData.file);

        try {
            const res = await api.post('/music', data);
            if (res.success) {
                toast.success('Music uploaded successfully');
                setIsModalOpen(false);
                setFormData({ title: '', artist: '', genre: '', file: null });
                fetchSongs();
            }
        } catch (err) {
            toast.error(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div></div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <FiPlus /> Add Music
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artist</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Genre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                        ) : songs.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">No music found</td></tr>
                        ) : (
                            songs.map((song) => (
                                <tr key={song._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleTogglePlay(song)}
                                            className="p-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        >
                                            {playingId === song._id ? <FiPause /> : <FiPlay />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{song.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{song.artist}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{song.genre || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button onClick={() => handleToggleStatus(song._id)} className="text-xl">
                                            {song.isActive ? <FiToggleRight className="text-green-600" /> : <FiToggleLeft className="text-gray-400" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button onClick={() => handleDelete(song._id)} className="text-red-600 hover:text-red-900">
                                            <FiTrash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black"
                            onClick={() => !uploading && setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Add New Music</h2>
                                <button onClick={() => setIsModalOpen(false)} disabled={uploading}>
                                    <FiX className="text-gray-500 text-xl" />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Song Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. Energetic Beats"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Artist *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.artist}
                                        onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. NoCopyrightSounds"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                                    <input
                                        type="text"
                                        value={formData.genre}
                                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. Pop, Cinematic"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Audio File *</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                                        <div className="space-y-1 text-center">
                                            <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600">
                                                <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                                                    <span>Upload a file</span>
                                                    <input
                                                        type="file"
                                                        className="sr-only"
                                                        accept="audio/*"
                                                        onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                                                    />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {formData.file ? formData.file.name : 'MP3, WAV up to 10MB'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {uploading ? 'Uploading...' : 'Save to Library'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
