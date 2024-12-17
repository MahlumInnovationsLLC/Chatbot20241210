// app.jsx
import React, { useContext, useState, useRef, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import FileUpload from './components/FileUpload';
import { ThemeProvider, ThemeContext } from './ThemeContext';
import { useMsal } from '@azure/msal-react';

export default function App() {
    const { instance } = useMsal();

    const logout = async () => {
        await instance.logoutRedirect();
        console.log("Logged out of Microsoft credentials via MSAL.");
    };

    return (
        <ThemeProvider>
            <AppContent onLogout={logout} />
        </ThemeProvider>
    );
}

function AppContent({ onLogout }) {
    const { theme } = useContext(ThemeContext);
    const logoUrl = "https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png";
    const bottomLogoUrl = "https://gymaidata.blob.core.windows.net/gymaiblobstorage/BlueMILLClonglogo.png";

    const [menuOpen, setMenuOpen] = useState(false);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState('dark');
    const [messages, setMessages] = useState([]); // For share logic demonstration
    const [activeTab, setActiveTab] = useState('theme'); // NEW: track which tab is selected

    const menuRef = useRef(null);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
        if (!menuOpen) {
            setShareMenuOpen(false);
        }
    };

    const openSettings = () => {
        setMenuOpen(false);
        setSelectedTheme(theme === 'dark' ? 'dark' : (theme === 'light' ? 'light' : 'system'));
        setActiveTab('theme'); // reset to 'theme' tab when settings open
        setSettingsOpen(true);
    };

    const closeSettings = () => {
        setSettingsOpen(false);
    };

    const saveSettings = () => {
        // If you had logic to toggle theme based on selectedTheme:
        // toggleTheme(selectedTheme);
        closeSettings();
    };

    const openShareMenu = () => {
        setShareMenuOpen(!shareMenuOpen);
    };

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

    // Close all menus if clicked outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuOpen || shareMenuOpen || settingsOpen) {
                if (menuRef.current && !menuRef.current.contains(e.target)) {
                    setMenuOpen(false);
                    setShareMenuOpen(false);
                    setSettingsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen, shareMenuOpen, settingsOpen]);

    // Content for settings tabs
    const renderSettingsContent = () => {
        switch (activeTab) {
            case 'theme':
                return (
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
                );
            case 'ai':
                return (
                    <div className="flex-1 flex flex-col justify-center items-start space-y-4">
                        <p className="text-sm">
                            Here you could configure AI instructions, for example prompt presets.
                        </p>
                    </div>
                );
            case 'empty1':
            case 'empty2':
            case 'empty3':
                return (
                    <div className="flex-1 flex flex-col justify-center items-center">
                        <p className="text-sm text-gray-500">Nothing here yet!</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={theme === 'dark' ? 'dark bg-gray-800 text-white min-h-screen flex flex-col' : 'bg-white text-black min-h-screen flex flex-col'}>
            {/* Top bar */}
            <div className="flex items-center justify-between w-full p-4 border-b border-gray-300 dark:border-gray-700 relative">
                <div className="flex items-center">
                    <img src={logoUrl} alt="Logo" className="h-8 w-auto mr-2" />
                    <span className="font-bold text-xl">GYM AI Engine</span>
                </div>

                {/* Menu Icon */}
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
                    <div ref={menuRef} className="absolute top-16 right-4 bg-gray-700 text-white rounded shadow-lg py-2 w-40 z-50 transform origin-top transition-transform duration-200 ease-out scale-y-100">
                        <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-600 flex items-center"
                            onClick={onLogout}
                        >
                            {/* Logout Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none"
                                viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M15.75 9V5.25A2.25 2.25 0
                                    0013.5 3h-9A2.25 2.25 0
                                    002.25 5.25v13.5A2.25 2.25
                                    0 005.25 21h8.25a2.25 2.25
                                    0 002.25-2.25V15M9 15l3-3m0
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
                                    d="M11.049 2.927c.3-.921 1.603-.921
                                    1.902 0 a1.724 1.724 0
                                    002.591.977l.519-.3a1.724
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
                                    0-1.902a1.724 1.724
                                    0 00.977-2.591l-.3-.519
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
                            <div className={"absolute top-2 right-full bg-gray-700 text-white rounded shadow-lg py-2 w-48 ml-2 z-50 transform origin-top transition-transform duration-200 ease-out scale-y-100"}>
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

            {/* Container to center the chat interface in the screen */}
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                {/* Chat Interface section */}
                <div className="w-[75vw] h-[75vh] relative flex flex-col rounded-md p-4 border border-gray-300 dark:border-gray-700">
                    <ChatInterface
                        onLogout={onLogout}
                        messages={messages}
                        setMessages={setMessages}
                    />
                </div>

                {/* Bottom-right branding wrapped in a link */}
                <a
                    href="https://www.mahluminnovations.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-4 right-4 flex items-center space-x-2 bg-opacity-90 rounded p-2"
                    style={{
                        backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255,255,255,0.9)',
                        border: theme === 'dark' ? '1px solid #374151' : '1px solid #ccc'
                    }}
                >
                    <img src={bottomLogoUrl} alt="Mahlum Innovations, LLC" className="h-6 w-auto" />
                    <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Powered by Mahlum Innovations, LLC
                    </span>
                </a>
            </div>

            {/* Settings Popup */}
            {settingsOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                    onClick={() => { setSettingsOpen(false); }}>
                    <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'} w-1/2 h-1/2 rounded p-4 flex flex-col transform origin-top transition-transform duration-200 ease-out scale-y-100`}
                        onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-3xl mb-4 font-bold">Settings</h2>

                        {/* Tabs */}
                        <div className="flex space-x-4 mb-4 border-b border-gray-500 pb-2">
                            <button
                                className={`text-lg ${activeTab === 'theme' ? 'font-bold underline' : ''}`}
                                onClick={() => setActiveTab('theme')}
                            >
                                Theme
                            </button>
                            <button
                                className={`text-lg ${activeTab === 'ai' ? 'font-bold underline' : ''}`}
                                onClick={() => setActiveTab('ai')}
                            >
                                AI Instructions
                            </button>
                            <button
                                className={`text-lg ${activeTab === 'empty1' ? 'font-bold underline' : ''}`}
                                onClick={() => setActiveTab('empty1')}
                            >
                                EMPTY
                            </button>
                            <button
                                className={`text-lg ${activeTab === 'empty2' ? 'font-bold underline' : ''}`}
                                onClick={() => setActiveTab('empty2')}
                            >
                                EMPTY
                            </button>
                            <button
                                className={`text-lg ${activeTab === 'empty3' ? 'font-bold underline' : ''}`}
                                onClick={() => setActiveTab('empty3')}
                            >
                                EMPTY
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'theme' && (
                                <div className="flex flex-col space-y-4">
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
                            )}
                            {activeTab === 'ai' && (
                                <div>
                                    <p className="text-sm text-gray-300">
                                        Here you can set AI instructions or presets.
                                    </p>
                                </div>
                            )}
                            {['empty1', 'empty2', 'empty3'].includes(activeTab) && (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-gray-500">Nothing here yet!</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-4">
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