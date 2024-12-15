// ChatInterface.jsx
import React, { useState, useContext } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';
import { ThemeContext } from '../ThemeContext';
import FileUpload from './FileUpload'; // Ensure this import exists if you're using this component

export default function ChatInterface({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { toggleTheme } = useContext(ThemeContext);

    const sendMessage = async () => {
        if (!userInput.trim()) return;
        const userMsg = { role: 'user', content: userInput };
        setMessages(prev => [...prev, userMsg]);
        setUserInput('');

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
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <div className="w-[75vw] h-[75vh] relative flex flex-col rounded-md p-4 overflow-visible"> {/* Ensuring overflow is visible */}
            {/* Top bar */}
            <div className="flex items-center justify-end mb-4 relative">
                {/* Hamburger Menu Button */}
                <button
                    onClick={toggleMenu}
                    className="relative z-50 focus:outline-none"
                >
                    <div className="w-6 h-6 flex flex-col justify-between">
                        <span className={`block h-0.5 bg-current transform transition-transform duration-300 ease-in-out ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                        <span className={`block h-0.5 bg-current transition-opacity duration-300 ease-in-out ${menuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                        <span className={`block h-0.5 bg-current transform transition-transform duration-300 ease-in-out ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                    </div>
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                    <div className="absolute top-14 right-0 bg-gray-700 text-white rounded shadow-lg py-2 w-40 animate-fadeIn">
                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                            onClick={onLogout}
                        >
                            LOGOUT
                        </button>
                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                            onClick={toggleTheme}
                        >
                            SETTINGS (Toggle Theme)
                        </button>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700 p-4 rounded-md border border-gray-500">
                {messages.map((m, i) => (
                    <MessageBubble key={i} role={m.role} content={m.content} />
                ))}
                {isLoading && <ThinkingBubble />}
            </div>
            <div className="flex space-x-2 items-center">
                {/* File upload button (reintroduced on the left side of the input) */}
                <FileUpload />

                <input
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 p-2 rounded text-black"
                    type="text"
                    placeholder="I'm here to help! Ask me anything..."
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Send
                </button>
            </div>
        </div>
    );
}