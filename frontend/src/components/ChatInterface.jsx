import React, { useState } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';

export default function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const sendMessage = async () => {
        if (!userInput.trim()) return;
        setErrorMessage('');
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
            setErrorMessage('Something went wrong. Please try again.');
        }
    };

    return (
        // Adjusted width classes: Removed max-w-md, added w-4/5 for about 80% width
        <div className="w-4/5 bg-gray-800 p-4 rounded-md">
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
            {errorMessage && (
                <div className="text-red-500 mt-2 text-sm">
                    {errorMessage}
                </div>
            )}
        </div>
    );
}