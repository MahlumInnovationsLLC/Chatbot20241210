// ChatInterface.jsx
import React, { useState, useContext, useRef } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';
import { ThemeContext } from '../ThemeContext';

export default function ChatInterface({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState('dark'); // 'dark' or 'light'
    const [fileName, setFileName] = useState('');
    const { toggleTheme, theme } = useContext(ThemeContext);

    const fileInputRef = useRef(null);

    const sendMessage = async () => {
        if (!userInput.trim()) return;
        const userMsg = { role: 'user', content: userInput };
        setMessages(prev => [...prev, userMsg]);
        setUserInput('');

        setIsLoading(true);

        try {
            // No file handling here since user input is separate.
            // If file was to be submitted along with message, we'd do multipart/form-data here.
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

    const openSettings = () => {
        setMenuOpen(false);
        // Initialize radio buttons according to current theme
        setSelectedTheme(theme === 'dark' ? 'dark' : 'light');
        setSettingsOpen(true);
    };

    const closeSettings = () => {
        setSettingsOpen(false);
    };

    const saveSettings = () => {
        // If user selected dark mode and current theme isn't dark, toggle it
        if (selectedTheme === 'dark' && theme !== 'dark') {
            toggleTheme();
        } else if (selectedTheme === 'light' && theme === 'dark') {
            toggleTheme();
        }
        closeSettings();
    };

    const handleFileClick = () => {
        // Trigger hidden file input
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            // If you need to submit file to server, you'd do that here or on sendMessage.
        } else {
            setFileName('');
        }
    };

    return (
        <div className="w-[75vw] h-[75vh] relative flex flex-col rounded-md p-4 overflow-visible">
            {/* Top bar */}
            <div className="flex items-center justify-end mb-4 relative overflow-visible">
                {/* Hamburger Menu Button */}
                <button
                    onClick={toggleMenu}
                    className="relative z-50 focus:outline-none"
                >
                    <div className="w-6 h-6 flex flex-col justify-between items-center">
                        <span className={`block h-0.5 ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'rotate-45 scale-x-150 translate-y-1.5' : 'scale-x-100'}`}></span>
                        <span className={`block h-0.5 ${theme === 'dark' ? 'bg-white' : 'bg-black'} transition-opacity duration-300 ease-in-out ${menuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                        <span className={`block h-0.5 ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? '-rotate-45 scale-x-150 -translate-y-1.5' : 'scale-x-100'}`}></span>
                    </div>
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                    <div className="absolute top-14 right-0 bg-gray-700 text-white rounded shadow-lg py-2 w-40 animate-fadeIn z-50">
                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                            onClick={onLogout}
                        >
                            LOGOUT
                        </button>
                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                            onClick={openSettings}
                        >
                            Settings
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
                {/* Paperclip icon for file upload */}
                <div className="relative flex items-center space-x-2">
                    <button
                        onClick={handleFileClick}
                        className="p-2 focus:outline-none"
                        title="Attach a file"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                            stroke="currentColor" className="w-5 h-5 text-white"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M21 12.75v3.375A4.125 4.125 0 0116.875 20.25h-9A4.125 4.125 0 013.75 16.125v-7.5A4.125 4.125 0 017.875 4.5h4.875" />
                        </svg>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {fileName && (
                        <span className="text-sm text-white truncate max-w-xs">
                            {fileName}
                        </span>
                    )}
                </div>

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

            {/* Settings Popup */}
            {settingsOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-gray-800 text-white w-1/2 h-1/2 rounded p-4 flex flex-col">
                        {/* Title */}
                        <h2 className="text-3xl mb-4 font-bold">Settings</h2>
                        {/* Radio buttons for Light/Dark mode */}
                        <div className="flex-1 flex flex-col justify-center items-start space-y-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="theme"
                                    checked={selectedTheme === 'dark'}
                                    onChange={() => setSelectedTheme('dark')}
                                    className="form-radio h-5 w-5 text-blue-600"
                                />
                                <span className="text-lg">Dark Mode</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="theme"
                                    checked={selectedTheme === 'light'}
                                    onChange={() => setSelectedTheme('light')}
                                    className="form-radio h-5 w-5 text-blue-600"
                                />
                                <span className="text-lg">Light Mode</span>
                            </label>
                        </div>
                        {/* Footer with Save button */}
                        <div className="flex justify-end">
                            <button
                                onClick={saveSettings}
                                className="bg-blue-600 text-white px-4 py-2 rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}