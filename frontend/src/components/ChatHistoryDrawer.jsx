import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ChatHistoryDrawer({ isOpen, onClose, userKey }) {
    const [recentChats, setRecentChats] = useState([]);

    useEffect(() => {
        if (isOpen && userKey) {
            // Fetch the user’s chats from the server
            axios.get(`/chats?userKey=${encodeURIComponent(userKey)}`)
                .then(res => {
                    setRecentChats(res.data.chats || []);
                })
                .catch(err => {
                    console.error('Failed to get chat history:', err);
                });
        }
    }, [isOpen, userKey]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed top-0 right-0 h-full w-[20%] bg-gray-800 text-white shadow-lg z-50 overflow-y-auto transition-all duration-300 ease-out animate-slideInFromRight"
            style={{ borderLeft: '1px solid #444' }}
        >
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
                <h3 className="text-xl font-bold">Manage Chats</h3>
                <button onClick={onClose} className="text-sm font-bold">
                    <i className="fa-light fa-xmark-large"></i>
                </button>
            </div>

            <div className="p-4 space-y-4">
                {recentChats.length === 0 && (
                    <p className="text-sm text-gray-400">
                        No chats found for this user.
                    </p>
                )}
                {recentChats.map((chat, idx) => (
                    <div
                        key={chat.id || idx}
                        className="p-2 border-b border-gray-700 cursor-pointer hover:bg-gray-700"
                        onClick={() => console.log('Open chat', chat.id)}
                    >
                        <p className="text-sm font-semibold">{chat.title || `Chat #${idx + 1}`}</p>
                        <p className="text-xs text-gray-400">{chat.createdAt}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
