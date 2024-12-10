import React, { useState } from 'react';
import axios from 'axios';

import MessageBubble from './MessageBubble';

export default function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');

    const sendMessage = async () => {
        if (!userInput.trim()) return;
        const userMsg = { role: 'user', content: userInput };
        setMessages([...messages, userMsg]);
        setUserInput('');

        try {
            const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/chat`, {
                userMessage: userInput
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="w-full max-w-md bg-gray-800 p-4 rounded-md">
            <div className="h-64 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700">
                {messages.map((m, i) => (
                    <MessageBubble key={i} role={m.role} content={m.content} />
                ))}
            </div>
            <div className="flex space-x-2">
                <input
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    className="flex-1 p-2 rounded text-black"
                    type="text"
                    placeholder="Ask me anything..."
                />
                <button onClick={sendMessage} className="bg-futuristic-accent text-white px-4 py-2 rounded">Send</button>
            </div>
        </div>
    );
}