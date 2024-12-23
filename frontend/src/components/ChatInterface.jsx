// ChatInterface.jsx
import React, { useState, useContext, useRef } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';
import { ThemeContext } from '../ThemeContext';

/**
 * Optional helper to ask your server/AI to create a short descriptive title.
 * You could also import a helper from elsewhere. Adjust the endpoint/logic as needed.
 */
async function generateChatTitle(messages) {
    try {
        // Limit to last 10 messages (or entire conversation if short).
        const snippet = messages.slice(-10);

        // Example request body; adjust your endpoint or logic as needed:
        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: `You are an assistant that creates short, descriptive conversation titles.
                    Provide a concise (3-6 words) but descriptive title. No quotes or punctuation.`
                },
                ...snippet,
                {
                    role: 'user',
                    content: 'Please provide a concise, descriptive title for this conversation.'
                }
            ],
            model: 'YOUR_OPENAI_MODEL'
        };

        // Suppose you have an endpoint /generateChatTitle that returns { title: "Short Title" }
        const response = await axios.post('/generateChatTitle', requestBody);
        return response.data.title || 'Untitled Chat';
    } catch (err) {
        console.error('Error generating chat title:', err);
        return 'Untitled Chat';
    }
}

export default function ChatInterface({ onLogout, messages, setMessages }) {
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [file, setFile] = useState(null);

    // Chat title + editing states
    const [chatTitle, setChatTitle] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');

    const { theme } = useContext(ThemeContext);
    const fileInputRef = useRef(null);

    // ------------------------------
    // Title editing logic
    // ------------------------------
    const handleTitleEditClick = () => {
        setTempTitle(chatTitle);      // Start with current title in our temp input
        setIsEditingTitle(true);
    };

    const handleTitleChange = (e) => {
        setTempTitle(e.target.value);
    };

    // Example function if you want to persist to server
    const saveTitleToServer = async (newTitle) => {
        // Optional: call an endpoint /renameChat if you wish
        // e.g. await axios.post('/renameChat', { chatId, newTitle })
        // For now, do nothing or just console.log
        console.log('Saving new chat title to server: ', newTitle);
    };

    const handleTitleSave = async () => {
        setIsEditingTitle(false);
        setChatTitle(tempTitle);
        try {
            await saveTitleToServer(tempTitle);
        } catch (err) {
            console.error('Error saving title:', err);
        }
    };

    // ------------------------------
    // Chat logic
    // ------------------------------
    const sendMessage = async () => {
        if (!userInput.trim() && !file) return;

        // Append user message
        const userMsg = { role: 'user', content: userInput };
        setMessages(prev => [...prev, userMsg]);
        setUserInput('');
        setIsLoading(true);

        try {
            let res;
            if (file) {
                // If a file is present, send multipart/form-data
                const formData = new FormData();
                formData.append('userMessage', userInput);
                formData.append('file', file);
                res = await axios.post('/chat', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                // Otherwise send standard JSON
                res = await axios.post('/chat', { userMessage: userInput });
            }

            const botMsg = {
                role: 'assistant',
                content: res.data.reply,
                references: res.data.references,
                downloadUrl: res.data.downloadUrl,
                reportContent: res.data.reportContent
            };

            // Append bot message
            setMessages(prev => [...prev, botMsg]);

            // Generate a chat title if we don't have one yet
            if (!chatTitle) {
                const updatedConversation = [...messages, userMsg, botMsg];
                const newTitle = await generateChatTitle(updatedConversation);
                setChatTitle(newTitle);
            }
        } catch (e) {
            console.error(e);
            const errorMsg = { role: 'assistant', content: 'Error occurred: ' + e.message };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            setFile(null);
            setFileName('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFileName(selectedFile.name);
            setFile(selectedFile);
        } else {
            setFileName('');
            setFile(null);
        }
    };

    // Filter out system messages so they don't appear in the chat bubble area
    const filteredMessages = messages.filter(m => m.role !== 'system');
    const showStartContent = filteredMessages.length === 0 && !isLoading;

    return (
        <div className="w-full h-full flex flex-col relative overflow-visible">
            {/* Display & Edit Chat Title */}
            {chatTitle && (
                <div className="px-4 py-2 mb-2">
                    {!isEditingTitle ? (
                        <h2 className="text-xl font-bold text-blue-400 flex items-center">
                            Chat Title: {chatTitle}
                            <button
                                onClick={handleTitleEditClick}
                                className="ml-2 text-sm text-gray-400 hover:text-gray-200"
                            >
                                <i className="fa-solid fa-pencil" />
                            </button>
                        </h2>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={tempTitle}
                                onChange={handleTitleChange}
                                className="p-1 text-black rounded"
                                style={{ maxWidth: '200px' }}
                            />
                            <button
                                onClick={handleTitleSave}
                                className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    )
                    }
                </div>
            )}

            <div className="flex-grow overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700 p-4 rounded-md border border-gray-500 relative">
                {showStartContent && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <img
                            src="https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png"
                            alt="Center Logo"
                            className="h-16 w-auto mb-4"
                        />
                        <h2 className="text-3xl mb-2 font-bold">Start chatting</h2>
                        <p className="text-sm text-gray-300">
                            I am here to help! How can I support you today?
                        </p>
                    </div>
                )}
                {!showStartContent && (
                    <>
                        {filteredMessages.map((m, i) => (
                            <MessageBubble
                                key={i}
                                role={m.role}
                                content={m.content}
                                references={m.references}
                                downloadUrl={m.downloadUrl}
                                reportContent={m.reportContent}
                            />
                        ))}
                        {isLoading && <ThinkingBubble />}
                    </>
                )}
            </div>

            {/* Bottom input area */}
            <div className="flex space-x-2 items-end px-4 pb-4">
                {/* Paperclip icon for file upload */}
                <div className="relative flex items-center space-x-2">
                    <button
                        onClick={handleFileClick}
                        className="p-2 focus:outline-none"
                        title="Attach a file"
                    >
                        <i
                            className={`fa-solid fa-paperclip ${theme === 'dark' ? 'text-white' : 'text-black'
                                } w-5 h-5`}
                        ></i>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {fileName && (
                        <span
                            className={`text-sm truncate max-w-xs ${theme === 'dark' ? 'text-white' : 'text-black'
                                }`}
                        >
                            {fileName}
                        </span>
                    )}
                </div>

                <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    wrap="soft"
                    className={`flex-1 p-6 rounded text-black ${theme === 'dark' ? '' : 'border border-gray-500'
                        } resize-none overflow-y-auto whitespace-pre-wrap`}
                    placeholder="I'm here to help! Ask me anything..."
                />
                <button
                    onClick={sendMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Send
                </button>
            </div>
        </div>
    );
}