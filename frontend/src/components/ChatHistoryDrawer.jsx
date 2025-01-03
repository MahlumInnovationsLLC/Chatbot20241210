﻿import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ChatHistoryDrawer({ isOpen, onClose, userKey, onSelectChat }) {
    const [recentChats, setRecentChats] = useState([]);

    useEffect(() => {
        if (isOpen && userKey) {
            axios
                .get(`/chats?userKey=${encodeURIComponent(userKey)}`)
                .then((res) => {
                    setRecentChats(res.data.chats || []);
                })
                .catch((err) => {
                    console.error('Failed to get chat history:', err);
                });
        }
    }, [isOpen, userKey]);

    const handleDeleteChat = async (chatId) => {
        try {
            await axios.post('/deleteChat', { userKey, chatId });
            setRecentChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
        } catch (err) {
            console.error('Error deleting chat:', err);
            alert('Failed to delete chat. Please try again.');
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="
                fixed top-0 right-0 h-full w-[30%]
                bg-gray-800 text-white shadow-lg z-50 
                overflow-y-auto
                transform transition-transform duration-200 ease-out 
                animate-slideInFromRight
            "
            style={{ borderLeft: '1px solid #444' }}
        >
            {/* Header area */}
            <div className="flex items-center justify-between p-4 border-b border-gray-600">
                <h3 className="text-xl font-bold">Manage Chats</h3>
                <button onClick={onClose} className="text-sm font-bold">
                    <i className="fal fa-times"></i>
                </button>
            </div>

            {/* Body area with chat list */}
            <div className="p-4 space-y-4">
                {recentChats.length === 0 && (
                    <p className="text-sm text-gray-400">
                        No chats found for this user.
                    </p>
                )}
                {recentChats.map((chat, idx) => (
                    <div
                        key={chat.id || idx}
                        className="flex justify-between items-center p-2 border-b border-gray-700 hover:bg-gray-700"
                    >
                        <div
                            className="flex-grow cursor-pointer"
                            onClick={() => {
                                if (onSelectChat) {
                                    onSelectChat(chat);
                                } else {
                                    console.log('Selected chat:', chat.id);
                                }
                            }}
                        >
                            <p className="text-sm font-semibold">
                                {chat.title || `Chat #${idx + 1}`}
                            </p>
                            {chat.createdAt ? (
                                <p className="text-xs text-gray-400">{chat.createdAt}</p>
                            ) : (
                                <p className="text-xs text-gray-400">
                                    {chat.messages ? `${chat.messages.length} messages` : 'No messages'}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => handleDeleteChat(chat.id)}
                            className="flex-shrink-0 text-red-600 hover:text-red-800 p-2 border border-red-600 rounded"
                            title="Delete chat"
                        >
                            <i className="fal fa-trash-can"></i>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
