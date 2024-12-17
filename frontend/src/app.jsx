// app.jsx
import React, { useContext, useState } from 'react';
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

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <div className={theme === 'dark' ? 'dark bg-gray-800 text-white min-h-screen flex flex-col' : 'bg-white text-black min-h-screen flex flex-col'}>
            {/* Top bar with logo and title aligned to the left and menu icon on the right */}
            <div className="flex items-center justify-between w-full p-4 border-b border-gray-300 dark:border-gray-700">
                <div className="flex items-center">
                    <img src={logoUrl} alt="Logo" className="h-8 w-auto mr-2" />
                    <span className="font-bold text-xl">GYM AI Engine</span>
                </div>
                {/* Hamburger Menu Button on the right */}
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
            </div>

            {/* Container to center the chat interface in the screen */}
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                {/* Chat Interface section */}
                <div className="w-[75vw] h-[75vh] relative flex flex-col rounded-md p-4 border border-gray-300 dark:border-gray-700">
                    <ChatInterface onLogout={onLogout} />
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
        </div>
    );
}
