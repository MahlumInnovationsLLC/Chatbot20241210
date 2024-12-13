import React, { useState, useRef } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';

export default function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState(null);

    const fileInputRef = useRef(null);

    const sendMessage = async () => {
        if (!userInput.trim() && !attachedFile) return;

        const userMsg = { role: 'user', content: userInput };
        setMessages(prev => [...prev, userMsg]);
        setUserInput('');

        setIsLoading(true);

        try {
            let res;
            if (attachedFile) {
                // Use FormData when a file is attached
                const formData = new FormData();
                formData.append('userMessage', userInput);
                formData.append('file', attachedFile);

                res = await axios.post('/chat', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                // Send as JSON if no file is attached
                res = await axios.post('/chat', { userMessage: userInput });
            }

            const botMsg = { role: 'assistant', content: res.data.reply };
            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            console.error(e);
            const errorMsg = { role: 'assistant', content: 'Error occurred: ' + e.message };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setAttachedFile(null); // clear file after send
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileButtonClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachedFile(e.target.files[0]);
        }
    };

    return (
        <div className="w-[75vw] h-[75vh] bg-gray-800 p-4 rounded-md flex flex-col">
            <div className="flex-grow overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700">
                {messages.map((m, i) => (
                    <MessageBubble key={i} role={m.role} content={m.content} />
                ))}
                {isLoading && <ThinkingBubble />}
            </div>
            <div className="flex items-center space-x-2">
                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                />

                {/* Show file name if attached */}
                {attachedFile && (
                    <div className="text-white text-sm truncate max-w-[100px]" title={attachedFile.name}>
                        {attachedFile.name}
                    </div>
                )}

                {/* File attach button */}
                <button
                    onClick={handleFileButtonClick}
                    className="bg-gray-600 text-white px-3 py-2 rounded"
                    title="Attach a file"
                >
                    📎
                </button>

                <input
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 p-2 rounded text-black"
                    type="text"
                    placeholder="I'm here to help! Ask me anything..."
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Send
                </button>
            </div>
        </div>
    );
}