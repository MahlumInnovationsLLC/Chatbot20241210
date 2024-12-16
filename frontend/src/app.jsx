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
    const logoUrl = "https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png";

    return (
        <div className={theme === 'dark' ? 'dark bg-gray-800 text-white min-h-screen' : 'bg-white text-black min-h-screen'}>
            <div className="p-4 flex flex-col items-center justify-center relative">
                {/* Re-added the logo image above the title */}
                <img src={logoUrl} alt="Logo" className="h-10 w-auto mb-4" />
                <h1 className="text-3xl mb-8 font-bold">GYM AI Engine</h1>

                <ChatInterface onLogout={onLogout} />

                <div className="mt-8">
                    <FileUpload />
                </div>
            </div>
        </div>
    );
}