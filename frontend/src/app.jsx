// app.jsx
import React, { useContext } from 'react';
import ChatInterface from './components/ChatInterface';
import FileUpload from './components/FileUpload';
import { ThemeProvider, ThemeContext } from './ThemeContext';
import { useMsal } from '@azure/msal-react';

export default function App() {
    const { instance } = useMsal();

    const logout = async () => {
        // Use MSAL's logoutRedirect to log out user from Microsoft credentials
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
    // You mentioned a different logo URL earlier, but here we maintain your provided one:
    const logoUrl = "https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png";

    return (
        <div className={theme === 'dark' ? 'dark bg-gray-800 text-white min-h-screen' : 'bg-white text-black min-h-screen'}>
            {/* Top bar with logo and title aligned to the left */}
            <div className="flex items-center justify-between w-full p-4 border-b border-gray-300 dark:border-gray-700">
                <div className="flex items-center">
                    <img src={logoUrl} alt="Logo" className="h-8 w-auto mr-2" />
                    <span className="font-bold text-xl">GYM AI Engine</span>
                </div>
            </div>

            {/* Main content: Centered larger logo, "Start chatting", and subtitle */}
            <div className="p-4 flex flex-col items-center justify-center flex-grow">
                {/* Centered larger logo */}
                <img src={logoUrl} alt="Center Logo" className="h-16 w-auto mb-4" />
                <h2 className="text-3xl mb-2 font-bold">Start chatting</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-8">
                    I am here to help! How can I support you today?
                </p>

                {/* Chat Interface section with border to distinguish the area */}
                <div className="w-[75vw] h-[75vh] relative flex flex-col rounded-md p-4 border border-gray-300 dark:border-gray-700">
                    <ChatInterface onLogout={onLogout} />
                </div>

                {/* File Upload below the chat interface */}
                <div className="mt-8">
                    <FileUpload />
                </div>
            </div>
        </div>
    );
}