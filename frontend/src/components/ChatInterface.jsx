// ChatInterface.jsx
import React, { useState, useContext } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';
import { ThemeContext } from '../ThemeContext';
import FileUpload from './FileUpload';

export default function ChatInterface({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsDarkMode, setSettingsDarkMode] = useState(false);
    const { toggleTheme, theme } = useContext(ThemeContext);

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

    const openSettings = () => {
        setMenuOpen(false);
        // Initialize the checkbox according to current theme
        setSettingsDarkMode(theme === 'dark');
        setSettingsOpen(true);
    };

    const closeSettings = () => {
        setSettingsOpen(false);
    };

    const saveSettings = () => {
        // If user selected dark mode and current theme isn't dark, toggle it
        if (settingsDarkMode && theme !== 'dark') {
            toggleTheme();
        } else if (!settingsDarkMode && theme === 'dark') {
            toggleTheme();
        }
        closeSettings();
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
                        <span
                            className={`block h-0.5 bg-current transform transition-all duration-300 ease-in-out origin-center
                                ${menuOpen ? 'rotate-45 scale-x-150 translate-y-1.5' : 'scale-x-100'}`}
                        ></span>
                        <span
                            className={`block h-0.5 bg-current transition-opacity duration-300 ease-in-out
                                ${menuOpen ? 'opacity-0' : 'opacity-100'}`}
                        ></span>
                        <span
                            className={`block h-0.5 bg-current transform transition-all duration-300 ease-in-out origin-center
                                ${menuOpen ? '-rotate-45 scale-x-150 -translate-y-1.5' : 'scale-x-100'}`}
                        ></span>
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
                {/* File upload button (just a paperclip icon now) */}
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

            {/* Settings Popup */}
            {settingsOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-gray-800 text-white w-1/2 h-1/2 rounded p-4 flex flex-col">
                        {/* Title */}
                        <h2 className="text-3xl mb-4 font-bold">Settings</h2>
                        {/* Content: Checkbox for Dark/Light Mode */}
                        <div className="flex-1 flex flex-col justify-center items-start space-y-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={settingsDarkMode}
                                    onChange={(e) => setSettingsDarkMode(e.target.checked)}
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                />
                                <span className="text-lg">Dark Mode</span>
                            </label>
                            {/* If you prefer radio buttons for Light/Dark mode:
                                <label className="flex items-center space-x-2">
                                    <input type="radio" name="theme" checked={settingsDarkMode} onChange={() => setSettingsDarkMode(true)} /> Dark Mode
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input type="radio" name="theme" checked={!settingsDarkMode} onChange={() => setSettingsDarkMode(false)} /> Light Mode
                                </label>
                            */}
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