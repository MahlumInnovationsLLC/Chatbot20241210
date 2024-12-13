import React, { useEffect } from 'react'
import ChatInterface from './components/ChatInterface'
import FileUpload from './components/FileUpload'

export default function App() {
    useEffect(() => {
        document.title = "GYM AI Engine"; // Dynamically set page title
    }, []);

    return (
        <div className="min-h-screen p-4 flex flex-col items-center justify-center relative">
            {/* Logo positioned in the top-left corner */}
            <div className="absolute top-4 left-4">
                <img src={logoUrl} alt="Logo" className="h-10 w-auto" />
            </div>
            <h1 className="text-3xl mb-8 font-bold text-futuristic-accent mt-20">GYM AI Engine</h1>
            <ChatInterface />
            <div className="mt-8">
                <FileUpload />
            </div>
        </div>
    )
}