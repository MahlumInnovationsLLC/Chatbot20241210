﻿import React from 'react'
import ChatInterface from './components/ChatInterface'
import FileUpload from './components/FileUpload'

export default function App() {
    return (
        <div className="min-h-screen p-4 flex flex-col items-center justify-center">
            <h1 className="text-3xl mb-8 font-bold text-futuristic-accent">Futuristic Chatbot</h1>
            <ChatInterface />
            <div className="mt-8">
                <FileUpload />
            </div>
        </div>
    )
}