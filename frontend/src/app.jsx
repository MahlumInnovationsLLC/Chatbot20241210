﻿import React, { useContext, useState, useRef, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import LeftTool from './components/LeftTool';
import RightTool from './components/RightTool';
import FileUpload from './components/FileUpload';
import { ThemeProvider, ThemeContext } from './ThemeContext';
import { useMsal } from '@azure/msal-react';
import axios from 'axios';

/**
 * A small helper function to generate a short chat title using OpenAI (or your chosen AI).
 * This is optional. Adjust the prompt as needed for your style.
 */
async function generateChatTitle(messages) {
    try {
        // Just take the last 10 messages, or the entire conversation if short
        const snippet = messages.slice(-10);

        // Construct a short prompt for summarizing the conversation
        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: `You are an assistant that creates short, descriptive conversation titles. 
                    We want a short (3-6 words) but descriptive title (no quotes).`
                },
                ...snippet,
                {
                    role: 'user',
                    content: 'Please provide a concise, descriptive title for this conversation.'
                }
            ],
            model: 'YOUR_OPENAI_MODEL' // e.g. "gpt-3.5-turbo" or your Azure deployment name
        };

        // Adjust your endpoint if using Azure or a separate route for generating titles:
        const response = await axios.post('/generateChatTitle', requestBody);
        return response.data.title || 'Untitled Chat';
    } catch (err) {
        console.error('Error generating chat title:', err);
        return 'Untitled Chat';
    }
}

export default function App() {
    const { instance } = useMsal();

    const logout = async () => {
        await instance.logoutRedirect();
        console.log('Logged out of Microsoft credentials via MSAL.');
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
    const logoUrl = 'https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png';
    const bottomLogoUrl =
        'https://gymaidata.blob.core.windows.net/gymaiblobstorage/BlueMILLClonglogo.png';

    const [menuOpen, setMenuOpen] = useState(false);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [shareUrlPopupOpen, setShareUrlPopupOpen] = useState(false);

    const limeGreen = '#a2f4a2';
    const customUrl = 'https://gymaidinegine.com';

    // Manage Chat: local and server side
    const [manageChatsOpen, setManageChatsOpen] = useState(false);

    // The main messages used by ChatInterface
    const [messages, setMessages] = useState([]);
    // system message for new chats
    const systemMessage = {
        role: 'system',
        content:
            'You are an AI assistant that can produce downloadable reports in Markdown link format. ' +
            'If asked for a report, produce `download://report.docx` in your response. ' +
            'Use Markdown formatting, references if external sources used. If none, write `References: None`.'
    };

    // Insert system message if not present
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([systemMessage]);
        } else if (messages[0].role !== 'system') {
            setMessages((prev) => [systemMessage, ...prev]);
        }
    }, []);

    // Create new chat logic
    const createNewChat = async () => {
        try {
            if (messages.length > 0) {
                // 1) Generate a title from the current conversation
                const chatTitle = await generateChatTitle(messages);
                // 2) Archive locally (or send to server). For now, local only
                console.log("Archived old chat with title:", chatTitle);
            }
            // 3) Clear out the conversation
            setMessages([systemMessage]);
        } catch (err) {
            console.error('Error archiving current chat before new chat:', err);
        }
    };

    // Additional states
    const [activeTab, setActiveTab] = useState('general');
    const [selectedTheme, setSelectedTheme] = useState('dark');
    const [aiMood, setAiMood] = useState('');
    const [aiInstructions, setAiInstructions] = useState('');
    const [archivedChats, setArchivedChats] = useState([]); // local archived

    // For the server-based user chats
    const [serverUserChats, setServerUserChats] = useState([]);
    const fetchUserChats = async () => {
        try {
            const res = await axios.get('/chats', { params: { userKey } });
            setServerUserChats(res.data.chats || []);
        } catch (err) {
            console.error('Failed to fetch user chats:', err);
        }
    };
    // If manage panel is open, fetch server chats
    useEffect(() => {
        if (manageChatsOpen) {
            fetchUserChats();
        }
    }, [manageChatsOpen]);

    // For outside click on the top menu
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuOpen || shareMenuOpen || settingsOpen || shareUrlPopupOpen) {
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

    // Save AI instructions in localStorage
    useEffect(() => {
        const savedData = localStorage.getItem(`ai_instructions_${userKey}`);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setAiMood(parsed.mood || '');
            setAiInstructions(parsed.instructions || '');
        }
    }, [userKey]);

    const saveAiInstructions = () => {
        const data = { mood: aiMood, instructions: aiInstructions };
        localStorage.setItem(`ai_instructions_${userKey}`, JSON.stringify(data));
        alert('AI Instructions saved!');
    };

    // Contact us
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

    // Archive + Delete
    const handleManageArchivedChats = () => {
        setManageChatsOpen(true);
    };
    const handleArchiveAll = async () => {
        try {
            await axios.post('/archiveAllChats', { userKey });
            alert('All chats have been archived.');
        } catch (err) {
            console.error('Error archiving chats:', err);
        }
    };
    const handleDeleteAll = async () => {
        try {
            await axios.post('/deleteAllChats', { userKey });
            alert('All chats have been deleted.');
        } catch (err) {
            console.error('Error deleting chats:', err);
        }
    };
    const loadArchivedChat = (chat) => {
        setMessages(chat.messages);
        setManageChatsOpen(false);
    };

    // “Share” menu
    const openShareMenu = () => {
        setShareMenuOpen(!shareMenuOpen);
    };
    const copyTranscriptToClipboard = () => {
        const allText = messages
            .map((m) => `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`)
            .join('\n\n');
        navigator.clipboard.writeText(allText).then(() => {
            alert('Transcript copied to clipboard!');
        });
    };
    const downloadTranscriptDocx = () => {
        const allText = messages
            .map((m) => `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`)
            .join('\n\n');
        const blob = new Blob([allText], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcript.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Settings
    const openSettings = () => {
        setMenuOpen(false);
        setSelectedTheme(theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system');
        setActiveTab('general');
        setSettingsOpen(true);
    };
    const closeSettings = () => setSettingsOpen(false);
    const saveSettings = () => {
        if (selectedTheme !== theme) {
            toggleTheme(selectedTheme);
        }
        closeSettings();
    };

    //**  BEGIN HORIZONTAL-PAGING LOGIC  **/
    // We'll define 3 pages: Left (LeftTool), Middle (ChatInterface), Right (RightTool).
    // Then we maintain an `activePageIndex` in state: 0 => Left, 1 => Middle, 2 => Right.
    const [activePageIndex, setActivePageIndex] = useState(1); // Start on middle page

    // Our list of pages with lime‐green borders
    const pages = [
        {
            title: 'Left Tool',
            component: (
                <div
                    style={{
                        // Add your desired color
                        border: `2px solid ${limeGreen}`,
                        borderRadius: '8px',
                        // Add margin so there's space between the chat and the top bar/sides
                        margin: '1rem',
                        // Or you can do padding if you want the green border plus some internal spacing
                        padding: '1rem',
                        // Make sure it expands vertically
                        flex: 1,
                        overflow: 'auto', // or whatever suits your layout
                        boxSizing: 'border-box'
                    }}
                >
                    <LeftTool />
                </div>
            )
        },
        {
            title: 'Chat',
            component: (
                <div
                    style={{
                        // Add your desired color
                        border: `2px solid ${limeGreen}`,
                        borderRadius: '8px',
                        // Add margin so there's space between the chat and the top bar/sides
                        margin: '1rem',
                        // Or you can do padding if you want the green border plus some internal spacing
                        padding: '1rem',
                        // Make sure it expands vertically
                        flex: 1,
                        overflow: 'auto', // or whatever suits your layout
                        boxSizing: 'border-box'
                    }}
                >
                    <ChatInterface
                        onLogout={onLogout}
                        messages={messages}
                        setMessages={setMessages}
                    />
                </div>
            )
        },
        {
            title: 'Right Tool',
            component: (
                <div
                    style={{
                        // Add your desired color
                        border: `2px solid ${limeGreen}`,
                        borderRadius: '8px',
                        // Add margin so there's space between the chat and the top bar/sides
                        margin: '1rem',
                        // Or you can do padding if you want the green border plus some internal spacing
                        padding: '1rem',
                        // Make sure it expands vertically
                        flex: 1,
                        overflow: 'auto', // or whatever suits your layout
                        boxSizing: 'border-box'
                    }}
                >
                    <RightTool />
                </div>
            )
        }
    ];

    // Switch pages
    const handleSwitchPage = (index) => {
        setActivePageIndex(index);
    };

    // We'll define the styling for the container with 3 pages side-by-side
    const pageWidth = 100; // each page is full viewport width
    const containerStyle = {
        width: `${pages.length * 100}vw`,
        display: 'flex',
        transition: 'transform 0.4s ease-in-out',
        transform: `translateX(-${activePageIndex * pageWidth}vw)`
    };

    // The top bar “titles” that fade out for the non-active pages
    // We'll keep them center, next to the menu icon, etc.
    const topBarTitlesStyle = {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem'
    };

    // Render a button for each page
    const topBarPages = pages.map((p, i) => (
        <button
            key={i}
            className="px-2 py-1 rounded"
            style={{
                backgroundColor: i === activePageIndex ? limeGreen : 'transparent',
                color: i === activePageIndex
                    ? (theme === 'dark' ? 'black' : 'black')
                    : (theme === 'dark' ? 'white' : 'black'),
                opacity: i === activePageIndex ? 1 : 0.6,
                fontWeight: i === activePageIndex ? 'bold' : 'normal'
            }}
            onClick={() => handleSwitchPage(i)}
        >
            {p.title}
        </button>
    ));

    // Renders the content for the Settings popup
    const renderSettingsContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="flex flex-col space-y-6">
                        {/* Row: Theme + dropdown */}
                        <div className="flex items-center justify-between pr-2 border-b border-gray-600 pb-2">
                            <label className="text-lg font-semibold mr-4 flex items-center">
                                Theme
                            </label>
                            <select
                                value={selectedTheme}
                                onChange={(e) => setSelectedTheme(e.target.value)}
                                className="bg-white text-black border p-2 rounded w-44"
                            >
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                                <option value="system">System</option>
                            </select>
                        </div>

                        {/* Row: Language + dropdown */}
                        <div className="flex items-center justify-between pr-2 border-b border-gray-600 pb-2">
                            <label className="text-lg font-semibold mr-4">Language</label>
                            <select
                                // you can store this in state if you want
                                className="bg-white text-black border p-2 rounded w-44"
                            >
                                <option value="auto">Auto-detect</option>
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                            </select>
                        </div>

                        {/* Archived chats */}
                        <div>
                            <div className="flex items-center justify-between pr-2 border-b border-gray-600 pb-2">
                                <label className="text-lg font-semibold">Archived chats</label>
                                <button
                                    onClick={handleManageArchivedChats}
                                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                                    style={{ width: '11rem' }}
                                >
                                    Manage
                                </button>
                            </div>

                            {/* Archive & Delete row, aligned right */}
                            <div className="flex flex-col items-end space-y-2 pr-2 mt-2">
                                <button
                                    onClick={handleArchiveAll}
                                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                                    style={{ width: '11rem' }}
                                >
                                    Archive all chats
                                </button>

                                <button
                                    onClick={handleDeleteAll}
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                    style={{ width: '11rem' }}
                                >
                                    Delete all chats
                                </button>
                            </div>
                        </div>

                        {/* Log out on this device */}
                        <div className="flex justify-end mt-6 pr-2">
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
                                onChange={(e) => setAiMood(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="e.g., Friendly, Professional, Enthusiastic..."
                            />
                        </div>
                        <div className="flex flex-col w-full space-y-2">
                            <label className="text-lg font-semibold">AI Instructions:</label>
                            <textarea
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-black'
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
            case 'empty1': // Contact Us
                return (
                    <div className="flex flex-col space-y-4">
                        <h2 className="text-xl font-bold">Contact Us</h2>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">First Name:</label>
                            <input
                                type="text"
                                value={contactNameFirst}
                                onChange={(e) => setContactNameFirst(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="First Name"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Last Name:</label>
                            <input
                                type="text"
                                value={contactNameLast}
                                onChange={(e) => setContactNameLast(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="Last Name"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Company:</label>
                            <input
                                type="text"
                                value={contactCompany}
                                onChange={(e) => setContactCompany(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="Company Name"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Email:</label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-black'
                                    }`}
                                placeholder="Your Email"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label className="text-lg font-semibold">Note:</label>
                            <textarea
                                value={contactNote}
                                onChange={(e) => setContactNote(e.target.value)}
                                className={`w-full p-2 rounded border ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-white'
                                        : 'border-gray-300 bg-white text-black'
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

                {/* The 3-page “tool” nav in the middle */}
                <div style={topBarTitlesStyle}>{topBarPages}</div>

                {/* Right side: Chat History + Menu */}
                <div ref={menuRef} className="flex items-center space-x-2">
                    <button
                        onClick={() => setManageChatsOpen(!manageChatsOpen)}
                        style={{
                            border: `2px solid ${limeGreen}`,
                            color: theme === 'dark' ? 'white' : 'black',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px'
                        }}
                    >
                        Chat History
                    </button>

                    {/* hamburger menu */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="relative z-50 focus:outline-none rounded p-1"
                        style={{
                            width: '2rem',
                            height: '2rem',
                            border: `1px solid ${limeGreen}`
                        }}
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
                            className="absolute top-16 right-0 bg-gray-700 text-white rounded shadow-lg py-2 w-44 z-50 transform origin-top transition-transform duration-200 ease-out animate-slideDown"
                            style={{ marginRight: '0.5rem' }}
                        >
                            <button
                                className="block w-full text-left px-4 py-2 hover:bg-opacity-80 flex items-center"
                                onClick={createNewChat}
                            >
                                <i className="fa-light fa-broom mr-2"></i>
                                New Chat
                            </button>

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
                                                    (m) =>
                                                        `${m.role === 'user' ? 'You:' : 'Bot:'} ${m.content}`
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

            {/* MAIN BODY: a container that holds 3 pages side by side */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={containerStyle}>
                    {pages.map((p, i) => (
                        <div
                            key={i}
                            style={{
                                minWidth: '100vw',
                                height: '100%', // fill vertical space
                                overflow: 'auto'
                            }}
                        >
                            {p.component}
                        </div>
                    ))}
                </div>
            </div>

            {/* FOOTER / BOTTOM LOGO */}
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
                <span className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Powered by Mahlum Innovations, LLC
                </span>
            </a>

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
                                <i className="fa-sharp fa-light fa-gear mr-2"></i>
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

                        {/* SAVE BUTTON */}
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

            {/* RIGHT-SIDE Manage Chats SIDEBAR */}
            {manageChatsOpen && (
                <div
                    className="fixed inset-0 z-50 flex justify-end"
                    onClick={(e) => {
                        // if user clicks outside the panel, close it
                        if (e.target === e.currentTarget) {
                            setManageChatsOpen(false);
                        }
                    }}
                >
                    <div className="bg-gray-900 text-white w-1/5 h-full p-4 transform transition-transform duration-300 ease-in-out overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Your Chats</h3>
                            <button
                                onClick={() => setManageChatsOpen(false)}
                                className="text-sm font-bold"
                            >
                                <i className="fa-light fa-xmark-large"></i>
                            </button>
                        </div>

                        <p className="text-lg mb-2">Server-based Chats:</p>
                        {serverUserChats && serverUserChats.length > 0 ? (
                            serverUserChats.map((chat, idx) => (
                                <div
                                    key={idx}
                                    className="bg-gray-700 p-2 rounded mb-2 cursor-pointer hover:bg-gray-600"
                                    onClick={() => {
                                        setMessages(chat.messages);
                                        setManageChatsOpen(false);
                                    }}
                                >
                                    {/* AI-Generated Title or fallback */}
                                    <p className="font-bold">{chat.title || 'Chat from server'}</p>
                                    <p className="text-xs text-gray-300">
                                        {chat.userKey} |{' '}
                                        {chat.messages
                                            ? `${chat.messages.length} msgs`
                                            : '0 msgs'}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">No server-based chats found.</p>
                        )}

                        <hr className="my-4 border-gray-600" />

                        <p className="text-lg mb-2">Locally archived chats:</p>
                        {archivedChats && archivedChats.length > 0 ? (
                            archivedChats.map((chat, idx) => (
                                <div
                                    key={idx}
                                    className="bg-gray-700 p-2 rounded mb-2 cursor-pointer hover:bg-gray-600"
                                    onClick={() => loadArchivedChat(chat)}
                                >
                                    <p className="font-bold">{chat.title || 'Untitled chat'}</p>
                                    <p className="text-xs text-gray-300">
                                        {chat.userKey} | {chat.messages.length} msgs
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">No locally archived chats yet.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}