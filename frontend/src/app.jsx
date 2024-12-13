import React, { useEffect } from 'react'
import ChatInterface from './components/ChatInterface'
import FileUpload from './components/FileUpload'

export default function App() {
    useEffect(() => {
        document.title = "GYM AI Engine"; // Dynamically set page title
    }, []);

    return (
        <div className="min-h-screen p-4 flex flex-col items-center justify-center">
            {/* Logo added above the title */}
            <img
                src="https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png"
                alt="Logo"
                className="mb-4 h-16 w-auto object-contain"
            />
            <h1 className="text-3xl mb-8 font-bold text-futuristic-accent">GYM AI Engine</h1>
            <ChatInterface />
            <div className="mt-8">
                <FileUpload />
            </div>
        </div>
    )
}
