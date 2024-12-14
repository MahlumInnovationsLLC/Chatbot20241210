// App.jsx
import React, { useEffect, useContext } from 'react';
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

    // Apply theme classes to the root container
    return (
        <div className={theme === 'dark' ? 'dark bg-gray-800 text-white min-h-screen' : 'bg-white text-black min-h-screen'}>
            <div className="p-4 flex flex-col items-center justify-center relative">
                <h1 className="text-3xl mb-8 font-bold">GYM AI Engine</h1>
                <ChatInterface onLogout={onLogout} />
                <div className="mt-8">
                    <FileUpload />
                </div>
            </div>
        </div>
    );
}