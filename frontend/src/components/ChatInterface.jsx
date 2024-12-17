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
    const [selectedTheme, setSelectedTheme] = useState('dark'); // 'dark', 'light', 'system'
    const [fileName, setFileName] = useState('');
    const [shareMenuOpen, setShareMenuOpen] = useState(false); // NEW for share submenu

    const { toggleTheme, theme } = useContext(ThemeContext);

    const fileInputRef = useRef(null);

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
        if (!menuOpen) {
            // If opening the main menu, ensure share menu is closed
            setShareMenuOpen(false);
        }
    };

    const openSettings = () => {
        setMenuOpen(false);
        // Set selectedTheme based on current theme
        setSelectedTheme(theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system');
        setSettingsOpen(true);
    };

    const closeSettings = () => {
        setSettingsOpen(false);
    };

    const saveSettings = () => {
        if (selectedTheme !== theme) {
            toggleTheme(selectedTheme);
        }
        closeSettings();
    };

    const handleFileClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
        } else {
            setFileName('');
        }
    };

    // Determine if we should show the "start chatting" content
    const showStartContent = messages.length === 0 && !isLoading;

    // Share Functions
    const copyTranscriptToClipboard = () => {
        const allText = messages.map(m => `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`).join('\n\n');
        navigator.clipboard.writeText(allText).then(() => {
            alert('Transcript copied to clipboard!');
        });
    };

    const downloadTranscriptDocx = () => {
        const allText = messages.map(m => `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`).join('\n\n');
        const blob = new Blob([allText], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getMailToLink = () => {
        const subject = encodeURIComponent('Chat Transcript');
        const body = encodeURIComponent(messages.map(m => `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`).join('\n\n'));
        return `mailto:?subject=${subject}&body=${body}`;
    };

    const openShareMenu = () => {
        setShareMenuOpen(!shareMenuOpen);
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-visible">
            {/* Top bar inside the chat box */}
            <div className="flex items-center justify-end mb-4 relative pr-4">
                <button
                    onClick={toggleMenu}
                    className={`relative z-50 focus:outline-none border ${theme === 'dark' ? 'border-white' : 'border-black'} rounded p-1`}
                    style={{ width: '2rem', height: '2rem' }}
                >
                    <div className="relative w-full h-full">
                        {/* Top Line */}
                        <span className={`absolute top-[45%] left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'rotate-45 -translate-x-1/2 -translate-y-1/2' : '-translate-x-1/2 -translate-y-[0.4rem]'}`}></span>
                        {/* Middle Line */}
                        <span className={`absolute top-1/2 left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'opacity-0' : '-translate-x-1/2 -translate-y-1/2'}`}></span>
                        {/* Bottom Line */}
                        <span className={`absolute top-[45%] left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? '-rotate-45 -translate-x-1/2 -translate-y-1/2' : '-translate-x-1/2 translate-y-[0.4rem]'}`}></span>
                    </div>
                </button>

                {menuOpen && (
                    <div className="absolute top-14 right-0 bg-gray-700 text-white rounded shadow-lg py-2 w-40 animate-fadeIn z-50">
                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600 flex items-center"
                            onClick={onLogout}
                        >
                            {/* Logout Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                                viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-9A2.25 2.25
                                     0 002.25 5.25v13.5A2.25 2.25 0
                                     005.25 21h8.25a2.25 2.25 0
                                     002.25-2.25V15M9 15l3-3m0
                                     0l-3-3m3 3H21" />
                            </svg>
                            Logout
                        </button>

                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600 flex items-center"
                            onClick={openSettings}
                        >
                            {/* Settings (Gear) Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                                viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0
                                     a1.724 1.724 0 002.591.977l.519-.3a1.724
                                     1.724 0 012.362.53 1.724 1.724
                                     0 00.53 2.362l-.3.519a1.724
                                     1.724 0 00.977 2.591c.921.3.921
                                     1.603 0 1.902a1.724 1.724
                                     0 00-.977 2.591l.3.519a1.724
                                     1.724 0 01-.53 2.362 1.724 1.724
                                     0 01-2.362.53l-.519-.3a1.724
                                     1.724 0 00-2.591.977c-.3.921-1.603.921-1.902
                                     0a1.724 1.724 0 00-2.591-.977l-.519.3a1.724
                                     1.724 0 01-2.362-.53 1.724 1.724
                                     0 01-.53-2.362l.3-.519a1.724
                                     1.724 0 00-.977-2.591c-.921-.3-.921-1.603
                                     0-1.902a1.724 1.724 0 00.977-2.591l-.3-.519
                                     a1.724 1.724 0 01.53-2.362 1.724 1.724
                                     0 012.362-.53l.519.3a1.724 1.724
                                     0 002.591-.977z"/>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </button>

                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600 flex items-center"
                            onClick={openShareMenu}
                        >
                            {/* Share Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                                viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M9 9l4.5-4.5M9 9h6M9 9v6M5.25
                                     21h13.5a2.25 2.25 0
                                     002.25-2.25V5.25A2.25 2.25
                                     0 0018.75 3H5.25A2.25 2.25
                                     0 003 5.25v13.5A2.25 2.25
                                     0 005.25 21z"/>
                            </svg>
                            Share
                        </button>

                        {shareMenuOpen && (
                            <div className="absolute top-0 left-full bg-gray-700 text-white rounded shadow-lg py-2 w-48 ml-2 animate-fadeIn z-50">
                                <a
                                    href={getMailToLink()}
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                                >
                                    Share via Email
                                </a>
                                <button
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                                    onClick={copyTranscriptToClipboard}
                                >
                                    Copy Transcript
                                </button>
                                <button
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-600"
                                    onClick={downloadTranscriptDocx}
                                >
                                    Download as DOCX
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700 p-4 rounded-md border border-gray-500 relative">
                {showStartContent && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <img src="https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png" alt="Center Logo" className="h-16 w-auto mb-4" />
                        <h2 className="text-3xl mb-2 font-bold">Start chatting</h2>
                        <p className="text-sm text-gray-300">
                            I am here to help! How can I support you today?
                        </p>
                    </div>
                )}
                {!showStartContent && (
                    <>
                        {messages.map((m, i) => (
                            <MessageBubble key={i} role={m.role} content={m.content} />
                        ))}
                        {isLoading && <ThinkingBubble />}
                    </>
                )}
            </div>
            <div className="flex space-x-2 items-center px-4 pb-4">
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
                            stroke="currentColor"
                            className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
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
                        <span className={`text-sm truncate max-w-xs ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            {fileName}
                        </span>
                    )}
                </div>

                <input
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`flex-1 p-2 rounded text-black ${theme === 'dark' ? '' : 'border border-gray-500'}`}
                    type="text"
                    placeholder="I'm here to help! Ask me anything..."
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Send
                </button>
            </div>

            {/* Settings Popup */}
            {settingsOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'} w-1/2 h-1/2 rounded p-4 flex flex-col`}>
                        {/* Title */}
                        <h2 className="text-3xl mb-4 font-bold">Settings</h2>
                        {/* Radio buttons for Light/Dark/System mode */}
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
                            <label className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    name="theme"
                                    checked={selectedTheme === 'system'}
                                    onChange={() => setSelectedTheme('system')}
                                    className="form-radio h-5 w-5 text-blue-600"
                                />
                                <span className="text-lg">System</span>
                            </label>
                        </div>
                        {/* Footer with Save button */}
                        <div className="flex justify-end">
                            <button
                                onClick={saveSettings}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
