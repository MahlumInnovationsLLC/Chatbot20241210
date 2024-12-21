import React, { useContext, useState, useRef, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import FileUpload from './components/FileUpload';
import { ThemeProvider, ThemeContext } from './ThemeContext';
import { useMsal } from '@azure/msal-react';
import axios from 'axios';

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
    const [shareUrlPopupOpen, setShareUrlPopupOpen] = useState(false);

    // Change default from 'dark' if desired
    const [selectedTheme, setSelectedTheme] = useState('dark');

    const [messages, setMessages] = useState([]);
    // Rename from 'theme' to 'general' in your new approach:
    const [activeTab, setActiveTab] = useState('general');

    const [aiMood, setAiMood] = useState('');
    const [aiInstructions, setAiInstructions] = useState('');

    const menuRef = useRef(null);

    const limeGreen = '#a2f4a2';
    const customUrl = "https://gymaidinegine.com";

    // Additional states for new "General" tab settings:
    const [alwaysShowCode, setAlwaysShowCode] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('auto'); // 'auto' => Auto-detect

    // For the new archived chats features:
    const handleManageArchivedChats = () => {
        // TODO: implement your own logic
        console.log("Manage archived chats clicked...");
    };
    const handleArchiveAll = () => {
        // TODO: implement your real logic
        console.log("Archive all chats clicked...");
    };
    const handleDeleteAll = () => {
        // TODO: implement your real logic
        console.log("Delete all chats clicked...");
    };

    // System message
    const systemMessage = {
        role: 'system',
        content: (
            "You are an AI assistant that can produce downloadable reports in Markdown link format. "
            + "If asked for a report, produce `download://report.docx` in your response. "
            + "Use Markdown formatting, references if external sources used. If none, write `References: None`."
        )
    };

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([systemMessage]);
        } else {
            if (messages[0].role !== 'system') {
                setMessages(prev => [systemMessage, ...prev]);
            }
        }
    }, []);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
        if (!menuOpen) {
            setShareMenuOpen(false);
        }
    };

    const openSettings = () => {
        setMenuOpen(false);
        // If theme is dark, setSelectedTheme('dark'), etc.
        setSelectedTheme(theme === 'dark' ? 'dark' : (theme === 'light' ? 'light' : 'system'));
        // Switch to the new "general" tab by default
        setActiveTab('general');
        setSettingsOpen(true);
    };

    const closeSettings = () => {
        setSettingsOpen(false);
    };

    const saveSettings = () => {
        // If user changed theme
        if (selectedTheme !== theme) {
            toggleTheme(selectedTheme);
        }
        closeSettings();
    };

    const openShareMenu = () => {
        setShareMenuOpen(!shareMenuOpen);
    };

    const copyTranscriptToClipboard = () => {
        const allText = messages
            .map(m => `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`)
            .join('\n\n');
        navigator.clipboard.writeText(allText).then(() => {
            alert('Transcript copied to clipboard!');
        });
    };

    const downloadTranscriptDocx = () => {
        const allText = messages
            .map(m => `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`)
            .join('\n\n');
        const blob = new Blob(
            [allText],
            { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if ((menuOpen || shareMenuOpen || settingsOpen || shareUrlPopupOpen)) {
                if (
                    menuRef.current &&
                    !menuRef.current.contains(e.target) &&
                    !settingsOpen &&
                    !shareUrlPopupOpen
                ) {
                    setMenuOpen(false);
                    setShareMenuOpen(false);
                    setSettingsOpen(false);
                } else if ((menuOpen || shareMenuOpen) && !settingsOpen && !shareUrlPopupOpen) {
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
    }, [menuOpen, shareMenuOpen, settingsOpen, shareUrlPopupOpen]);

    // Load AI instructions from localStorage
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

    // New Contact Us tab state
    const [contactNameFirst, setContactNameFirst] = useState('');
    const [contactNameLast, setContactNameLast] = useState('');
    const [contactCompany, setContactCompany] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactNote, setContactNote] = useState('');

    const sendContactForm = async () => {
        try {
            const formData = {
                firstName: contactNameFirst,
                lastName: contactNameLast,
                company: contactCompany,
                email: contactEmail,
                note: contactNote
            };
            await axios.post('/contact', formData);
            alert('Your message has been sent successfully!');
            // Clear fields
            setContactNameFirst('');
            setContactNameLast('');
            setContactCompany('');
            setContactEmail('');
            setContactNote('');
        } catch (e) {
            console.error('Error sending contact form:', e);
            alert('Failed to send your message. Please try again later.');
        }
    };

    // RENDER SETTINGS CONTENT
    const renderSettingsContent = () => {
        switch (activeTab) {
            // RENAMED from 'theme' to 'general'
            case 'general':
                return (
                    <div className="flex flex-col space-y-6">

                        {/* Row: "Theme" + dropdown */}
                        <div className="flex items-center justify-between">
                            <label className="font-semibold mr-4">Theme</label>
                            <select
                                value={selectedTheme}
                                onChange={e => setSelectedTheme(e.target.value)}
                                // Make background white and text black for easy reading
                                className="bg-white text-black border p-2 rounded w-44"
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                                <option value="system">System</option>
                            </select>
                        </div>

                        {/* Row: "Always show code..." + checkbox */}
                        <div className="flex items-center justify-between">
                            <label className="font-semibold mr-4">
                                Always show code when using data analyst
                            </label>
                            <input
                                type="checkbox"
                                checked={alwaysShowCode}
                                onChange={e => setAlwaysShowCode(e.target.checked)}
                                className="form-checkbox h-5 w-5 text-blue-600"
                            />
                        </div>

                        {/* Row: "Language" + dropdown */}
                        <div className="flex items-center justify-between">
                            <label className="font-semibold mr-4">Language</label>
                            <select
                                value={selectedLanguage}
                                onChange={e => setSelectedLanguage(e.target.value)}
                                className="bg-white text-black border p-2 rounded w-44"
                            >
                                <option value="auto">Auto-detect</option>
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                {/* Add more languages here */}
                            </select>
                        </div>

                        {/* Archived chats section with Manage / Archive all / Delete all */}
                        <div>
                            <label className="font-semibold block mb-2">Archived chats</label>

                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-200 opacity-70">
                                    (Placeholder for description if needed)
                                </span>
                                <button
                                    onClick={handleManageArchivedChats}
                                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                                    style={{ minWidth: '6rem' }}
                                >
                                    Manage
                                </button>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <button
                                    onClick={handleArchiveAll}
                                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 text-left"
                                    style={{ minWidth: '8rem' }}
                                >
                                    Archive all chats
                                </button>

                                <button
                                    onClick={handleDeleteAll}
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-left"
                                    style={{ minWidth: '8rem' }}
                                >
                                    Delete all chats
                                </button>
                            </div>
                        </div>

                        {/* Log out on this device */}
                        <div className="flex justify-end mt-6">
                            <button
                                onClick={onLogout}
                                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                                style={{ minWidth: '10rem' }}
                            >
                                Log out on this device
                            </button>
                        </div>
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
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="e.g., Friendly, Professional, Enthusiastic..."
                            />
                        </div>
                        <div className="flex flex-col w-full space-y-2">
                            <label className="text-lg font-semibold">AI Instructions:</label>
                            <textarea
                                value={aiInstructions}
                                onChange={e => setAiInstructions(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'
                                    }`}
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

            // CONTACT US => empty1
            case 'empty1':
                return (
                    <div className="flex flex-col space-y-4">
                        <h2 className="text-xl font-bold">Contact Us</h2>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">First Name:</label>
                            <input
                                type="text"
                                value={contactNameFirst}
                                onChange={e => setContactNameFirst(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="First Name"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Last Name:</label>
                            <input
                                type="text"
                                value={contactNameLast}
                                onChange={e => setContactNameLast(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="Last Name"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Company:</label>
                            <input
                                type="text"
                                value={contactCompany}
                                onChange={e => setContactCompany(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="Company Name"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Email:</label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={e => setContactEmail(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="Your Email"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Note:</label>
                            <textarea
                                value={contactNote}
                                onChange={e => setContactNote(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="How can we help?"
                                rows={5}
                            />
                        </div>
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={sendContactForm}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                );

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
        <div
            className={
                theme === 'dark'
                    ? 'dark bg-gray-800 text-white min-h-screen flex flex-col'
                    : 'bg-white text-black min-h-screen flex flex-col'
            }
        >
            {/* TOP BAR */}
            <div
                className="flex items-center justify-between w-full p-4"
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
                            <span
                                className={`absolute top-[45%] left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'
                                    } transform transition-all duration-300 ease-in-out origin-center ${menuOpen
                                        ? 'rotate-45 -translate-x-1/2 -translate-y-1/2'
                                        : '-translate-x-1/2 -translate-y-[0.4rem]'
                                    }`}
                            ></span>
                            <span
                                className={`absolute top-1/2 left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'
                                    } transform transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'opacity-0' : '-translate-x-1/2 -translate-y-1/2'
                                    }`}
                            ></span>
                            <span
                                className={`absolute top-[45%] left-1/2 block w-[1.2rem] h-[2px] ${theme === 'dark' ? 'bg-white' : 'bg-black'
                                    } transform transition-all duration-300 ease-in-out origin-center ${menuOpen
                                        ? '-rotate-45 -translate-x-1/2 -translate-y-1/2'
                                        : '-translate-x-1/2 translate-y-[0.4rem]'
                                    }`}
                            ></span>
                        </div>
                    </button>

                    {menuOpen && (
                        <div
                            className="absolute top-16 right-0 bg-gray-700 text-white rounded shadow-lg py-2 w-40 z-50 transform origin-top transition-transform duration-200 ease-out animate-slideDown"
                        >
                            <button
                                className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                onClick={onLogout}
                            >
                                <i className="fa-light fa-arrow-right-from-bracket mr-2"></i>
                                Logout
                            </button>

                            <button
                                className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                onClick={openSettings}
                            >
                                <i className="fa-light fa-gear mr-2"></i>
                                Settings
                            </button>

                            <button
                                className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                onClick={openShareMenu}
                            >
                                <i className="fa-light fa-share-from-square mr-2"></i>
                                Share
                            </button>
                            {shareMenuOpen && (
                                <div
                                    className="absolute top-2 right-full bg-gray-700 text-white rounded shadow-lg py-2 w-48 z-50 transform origin-top transition-transform duration-200 ease-out animate-slideDown"
                                    style={{
                                        right: '100%',
                                        left: 'auto',
                                        marginLeft: '-10px',
                                        marginTop: '4rem'
                                    }}
                                >
                                    <a
                                        href={`mailto:?subject=${encodeURIComponent(
                                            'Chat Transcript'
                                        )}&body=${encodeURIComponent(
                                            messages
                                                .map(
                                                    m =>
                                                        `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content
                                                        }`
                                                )
                                                .join('\n\n')
                                        )}`}
                                        className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                    >
                                        <i className="fa-light fa-envelope mr-2"></i>
                                        Share via Email
                                    </a>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                        onClick={copyTranscriptToClipboard}
                                    >
                                        <i className="fa-light fa-copy mr-2"></i>
                                        Copy Transcript
                                    </button>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                        onClick={downloadTranscriptDocx}
                                    >
                                        <i className="fa-light fa-download mr-2"></i>
                                        Download as .docx
                                    </button>
                                    <button
                                        className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                        onClick={() => setShareUrlPopupOpen(true)}
                                    >
                                        <i className="fa-light fa-copy mr-2"></i>
                                        Share URL
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN BODY */}
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <div
                    className="w-[85vw] h-[85vh] relative flex flex-col rounded-md p-4"
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
                        backgroundColor:
                            theme === 'dark'
                                ? 'rgba(31, 41, 55, 0.9)'
                                : 'rgba(255,255,255,0.9)',
                        border: `1px solid ${limeGreen}`
                    }}
                >
                    <img src={bottomLogoUrl} alt="Mahlum Innovations, LLC" className="h-6 w-auto" />
                    <span
                        className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-black'
                            }`}
                    >
                        Powered by Mahlum Innovations, LLC
                    </span>
                </a>
            </div>

            {/* SETTINGS POPUP */}
            {settingsOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setSettingsOpen(false);
                        }
                    }}
                >
                    <div
                        className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'
                            } w-1/2 h-1/2 rounded p-4 flex flex-col transform origin-top transition-transform duration-200 ease-out scale-y-100 animate-slideDown`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ border: `1px solid ${limeGreen}` }}
                    >
                        <h2 className="text-3xl mb-4 font-bold">Settings</h2>
                        <button
                            onClick={() => setSettingsOpen(false)}
                            className="absolute top-6 right-8 text-sm font-bold"
                        >
                            <i className="fa-light fa-xmark-large"></i>
                        </button>

                        {/* TAB BUTTONS */}
                        <div
                            className="flex space-x-4 mb-4 pb-2"
                            style={{ borderBottom: `1px solid ${limeGreen}` }}
                        >
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'general'
                                        ? 'bg-[#a2f4a2] text-black font-bold'
                                        : 'bg-gray-700 text-white'
                                    }`}
                                onClick={() => setActiveTab('general')}
                            >
                                <i className="fa-light fa-gear mr-2"></i>
                                General
                            </button>

                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'ai'
                                        ? 'bg-[#a2f4a2] text-black font-bold'
                                        : 'bg-gray-700 text-white'
                                    }`}
                                onClick={() => setActiveTab('ai')}
                            >
                                <i className="fa-light fa-head-side-gear mr-2"></i>
                                AI Instructions
                            </button>

                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'empty1'
                                        ? 'bg-[#a2f4a2] text-black font-bold'
                                        : 'bg-gray-700 text-white'
                                    }`}
                                onClick={() => setActiveTab('empty1')}
                            >
                                <i className="fa-light fa-address-book mr-2"></i>
                                Contact Us
                            </button>
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'empty2'
                                        ? 'bg-[#a2f4a2] text-black font-bold'
                                        : 'bg-gray-700 text-white'
                                    }`}
                                onClick={() => setActiveTab('empty2')}
                            >
                                EMPTY
                            </button>
                            <button
                                className={`px-2 py-1 rounded ${activeTab === 'empty3'
                                        ? 'bg-[#a2f4a2] text-black font-bold'
                                        : 'bg-gray-700 text-white'
                                    }`}
                                onClick={() => setActiveTab('empty3')}
                            >
                                EMPTY
                            </button>
                        </div>

                        {/* TAB CONTENT */}
                        <div className="flex-1 overflow-y-auto">{renderSettingsContent()}</div>

                        {/* SAVE BUTTON (for some tab changes) */}
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

            {/* SHARE URL POPUP */}
            {shareUrlPopupOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShareUrlPopupOpen(false);
                        }
                    }}
                >
                    <div
                        className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'
                            } w-auto h-auto rounded p-4 flex flex-col space-y-4 transform origin-top transition-transform duration-200 ease-out animate-slideDown`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ border: `1px solid ${limeGreen}` }}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Share the web app</h3>
                            <button
                                onClick={() => setShareUrlPopupOpen(false)}
                                className="text-sm font-bold"
                            >
                                <i className="fa-light fa-xmark-large"></i>
                            </button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                readOnly
                                className="border p-2 rounded flex-1"
                                value={customUrl}
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    alert('URL copied to clipboard!');
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center"
                            >
                                <i className="fa-light fa-copy mr-2"></i>
                                Copy URL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
