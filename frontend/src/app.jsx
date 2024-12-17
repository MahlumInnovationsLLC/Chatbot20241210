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
    const { instance } = useMsal();
    const account = instance.getActiveAccount();
    const userKey = account ? account.homeAccountId : 'default_user';

    const { theme, toggleTheme } = useContext(ThemeContext);
    const logoUrl = "https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png";
    const bottomLogoUrl = "https://gymaidata.blob.core.windows.net/gymaiblobstorage/BlueMILLClonglogo.png";

    const [menuOpen, setMenuOpen] = useState(false);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState('dark');
    const [messages, setMessages] = useState([]);
    const [activeTab, setActiveTab] = useState('theme');

    const [aiMood, setAiMood] = useState('');
    const [aiInstructions, setAiInstructions] = useState('');

    const menuRef = useRef(null);

    const limeGreen = '#a2f4a2';

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
        if (!menuOpen) {
            setShareMenuOpen(false);
        }
    };

    const openSettings = () => {
        setMenuOpen(false);
        setSelectedTheme(theme === 'dark' ? 'dark' : (theme === 'light' ? 'light' : 'system'));
        setActiveTab('theme');
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

    useEffect(() => {
        const handleClickOutside = (e) => {
            if ((menuOpen || shareMenuOpen || settingsOpen)) {
                if (menuRef.current && !menuRef.current.contains(e.target) && !settingsOpen) {
                    setMenuOpen(false);
                    setShareMenuOpen(false);
                    setSettingsOpen(false);
                } else if ((menuOpen || shareMenuOpen) && !settingsOpen) {
                    if (menuRef.current && !menuRef.current.contains(e.target)) {
                        setMenuOpen(false);
                        setShareMenuOpen(false);
                    }
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen, shareMenuOpen, settingsOpen]);

    useEffect(() => {
        const savedData = localStorage.getItem(`ai_instructions_${userKey}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setAiMood(parsed.mood || '');
            setAiInstructions(parsed.instructions || '');
        }
    }, [userKey]);

    const saveAiInstructions = () => {
        const data = {
            mood: aiMood,
            instructions: aiInstructions
        };
        localStorage.setItem(`ai_instructions_${userKey}`, JSON.stringify(data));
        alert('AI Instructions saved!');
    };

    const renderSettingsContent = () => {
        switch (activeTab) {
            case 'theme':
                return (
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
                );
            case 'ai':
                return (
                    <div className="flex flex-col space-y-4">
                        <div className="flex flex-col w-full space-y-2">
                            <label className="text-lg font-semibold">AI Mood:</label>
                            <input
                                type="text"
                                value={aiMood}
                                onChange={e => setAiMood(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`}
                                placeholder="e.g., Friendly, Professional, Enthusiastic..."
                            />
                        </div>
                        <div className="flex flex-col w-full space-y-2">
                            <label className="text-lg font-semibold">AI Instructions:</label>
                            <textarea
                                value={aiInstructions}
                                onChange={e => setAiInstructions(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'}`}
                                placeholder="Provide instructions for how the AI should behave..."
                                rows={5}
                            />
                        </div>
                        <div className="flex justify-center w-full mt-4">
                            <button
                                onClick={saveAiInstructions}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Save AI Instructions
                            </button>
                        </div>
                    </div>
                );
            case 'empty1':
            case 'empty2':
            case 'empty3':
                return (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-gray-500">Nothing here yet!</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={theme === 'dark' ? 'dark bg-gray-800 text-white min-h-screen flex flex-col' : 'bg-white text-black min-h-screen flex flex-col'}>
            <div className="flex items-center justify-between w-full p-4"
                style={{ borderBottom: `1px solid ${limeGreen}` }}
            >
                <div className="flex items-center">
                    <img src={logoUrl} alt="Logo" className="h-8 w-auto mr-2" />
                    <span className="font-bold text-xl">GYM AI Engine</span>
                </div>
                <div ref={menuRef}>
                    <button
                        onClick={toggleMenu}
                        className={`relative z-50 focus:outline-none rounded p-1`}
                        style={{ width: '2rem', height: '2rem', border: `1px solid ${limeGreen}` }}
                    >
                        <div className="relative w-full h-full">
                            <span className={`absolute top-[45%] left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'rotate-45 -translate-x-1/2 -translate-y-1/2' : '-translate-x-1/2 -translate-y-[0.4rem]'}`}></span>
                            <span className={`absolute top-1/2 left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'opacity-0' : '-translate-x-1/2 -translate-y-1/2'}`}></span>
                            <span className={`absolute top-[45%] left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'} transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? '-rotate-45 -translate-x-1/2 -translate-y-1/2' : '-translate-x-1/2 translate-y-[0.4rem]'}`}></span>
                        </div>
                    </button>

                    {menuOpen && (
                        <div className="absolute top-16 right-0 bg-gray-700 text-white rounded shadow-lg py-2 w-40 z-50 transform origin-top transition-transform duration-200 ease-out animate-slideDown"
                        >
                            <button
                                className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                onClick={onLogout}
                            >
                                <i className="fa-solid fa-right-to-bracket mr-2"></i>
                                Logout
                            </button>

                            <button
                                className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                onClick={openSettings}
                            >
                                <i className="fa-solid fa-gear mr-2"></i>
                                Settings
                            </button>

                            <button
                                className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                onClick={openShareMenu}
                            >
                                <i className="fa-solid fa-share-from-square mr-2"></i>
                                Share
                            </button>
                            {shareMenuOpen && (
                                <div className="absolute top-2 right-full bg-gray-700 text-white rounded shadow-lg py-2 w-48 z-50 transform origin-top transition-transform duration-200 ease-out animate-slideDown"
                                    style={{ right: '100%', left: 'auto', marginLeft: '-2px', marginTop: '2rem' }}
                                >
                                    <a
                                        href={getMailToLink()}
                                        className="block w-full text-left px-4 py-2 hover:bg-opacity-80"
                                    >
                                        Share via Email
                                    </a>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-opacity-80"
                                        onClick={copyTranscriptToClipboard}
                                    >
                                        Copy Transcript
                                    </button>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-opacity-80"
                                        onClick={downloadTranscriptDocx}
                                    >
                                        Download as DOCX
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="w-[75vw] h-[75vh] relative flex flex-col rounded-md p-4"
                    style={{ border: `1px solid ${limeGreen}` }}
                >
                    <ChatInterface
                        onLogout={onLogout}
                        messages={messages}
                        setMessages={setMessages}
                    />
                </div>

                <a
                    href="https://www.mahluminnovations.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-4 right-4 flex items-center space-x-2 bg-opacity-90 rounded p-2"
                    style={{
                        backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${limeGreen}`
                    }}
                >
                    <img src={bottomLogoUrl} alt="Mahlum Innovations, LLC" className="h-6 w-auto" />
                    <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Powered by Mahlum Innovations, LLC
                    </span>
                </a>
            </div>

            {settingsOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setSettingsOpen(false);
                        }
                    }}
                >
                    <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'} w-1/2 h-1/2 rounded p-4 flex flex-col transform origin-top transition-transform duration-200 ease-out scale-y-100 animate-slideDown`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ border: `1px solid ${limeGreen}` }}
                    >
                        <h2 className="text-3xl mb-4 font-bold">Settings</h2>
                        {/* Tabs row */}
                        <div className="flex space-x-4 mb-4 pb-2"
                            style={{ borderBottom: `1px solid ${limeGreen}` }}
                        >
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'theme' ? 'bg-[#a2f4a2] text-black font-bold' : 'bg-gray-700 text-white'}`}
                                onClick={() => setActiveTab('theme')}
                            >
                                Theme
                            </button>
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'ai' ? 'bg-[#a2f4a2] text-black font-bold' : 'bg-gray-700 text-white'}`}
                                onClick={() => setActiveTab('ai')}
                            >
                                AI Instructions
                            </button>
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'empty1' ? 'bg-[#a2f4a2] text-black font-bold' : 'bg-gray-700 text-white'}`}
                                onClick={() => setActiveTab('empty1')}
                            >
                                EMPTY
                            </button>
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'empty2' ? 'bg-[#a2f4a2] text-black font-bold' : 'bg-gray-700 text-white'}`}
                                onClick={() => setActiveTab('empty2')}
                            >
                                EMPTY
                            </button>
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'empty3' ? 'bg-[#a2f4a2] text-black font-bold' : 'bg-gray-700 text-white'}`}
                                onClick={() => setActiveTab('empty3')}
                            >
                                EMPTY
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {renderSettingsContent()}
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