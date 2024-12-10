import React from 'react';

export default function MessageBubble({ role, content }) {
    const isUser = role === 'user';
    return (
        <div className={`mb-2 p-2 rounded ${isUser ? 'bg-blue-700 text-white self-end' : 'bg-gray-700 text-white self-start'}`}>
            <p className="text-sm"><strong>{isUser ? 'You' : 'Bot'}</strong>: {content}</p>
        </div>
    );
}