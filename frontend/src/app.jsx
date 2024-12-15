// App.jsx
import React, { useContext } from 'react';
import ChatInterface from './components/ChatInterface';
import FileUpload from './components/FileUpload';
import { ThemeProvider, ThemeContext } from './ThemeContext';

export default function App() {
    // Stub logout function:
    const logout = () => {
        console.log("Logged out of Microsoft credentials.");
        // Implement your Microsoft logout logic here
    };

    return (
        <ThemeProvider>
            <AppContent onLogout={logout} />
        </ThemeProvider>
    );
}

function AppContent({ onLogout }) {
    const { theme } = useContext(ThemeContext);
    const logoUrl = "https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklenlogo.jpg";

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