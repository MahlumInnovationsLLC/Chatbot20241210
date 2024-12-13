﻿import React, { useState } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';

export default function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!userInput.trim()) return;
        const userMsg = { role: 'user', content: userInput };
        setMessages(prev => [...prev, userMsg]);
        setUserInput('');

        // Show loading state before API call
        setIsLoading(true);

        try {
            const res = await axios.post('/chat', { userMessage: userInput });
            const botMsg = { role: 'assistant', content: res.data.reply };
            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            console.error(e);
            const errorMsg = { role: 'assistant', content: 'Error occurred: ' + e.message };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            // Hide loading state after response
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-gray-800 p-4 rounded-md flex flex-col">
            <div className="flex-grow overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700">
                {messages.map((m, i) => (
                    <MessageBubble key={i} role={m.role} content={m.content} />
                ))}
                {/* If loading, show a "thinking" bubble */}
                {isLoading && (
                    <MessageBubble role="assistant" content="..." />
                )}
            </div>
            <div className="flex space-x-2">
                <input
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    className="flex-1 p-2 rounded text-black"
                    type="text"
                    placeholder="Ask me anything..."
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Send
                </button>
            </div>
        </div>
    );
}
