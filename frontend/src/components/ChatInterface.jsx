// ChatInterface.jsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';
import { ThemeContext } from '../ThemeContext';

/**
 * This helper can call your server to create a short, descriptive title
 * from the user’s first message. Or you can expand it to analyze multiple messages.
 */
async function generateChatTitle(messages) {
    try {
        // Just for demonstration: consider only the FIRST user message
        // (or last 10 messages, or entire conversation if you prefer)
        const snippet = messages.slice(0, 1);

        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: `You are an assistant that creates short, descriptive conversation titles. 
                    Provide a concise (3-6 words) but descriptive title. No quotes.`
                },
                ...snippet,
                {
                    role: 'user',
                    content: 'Please provide a concise, descriptive title for this conversation.'
                }
            ],
            // If using Azure, you can rename this to your deployment name
            model: 'YOUR_OPENAI_MODEL'
        };

        // Suppose you have an endpoint /generateChatTitle that returns { title: "...some short title..." }
        const response = await axios.post('/generateChatTitle', requestBody);
        return response.data.title || 'Untitled Chat';
    } catch (err) {
        console.error('Error generating chat title:', err);
        return 'Untitled Chat';
    }
}

export default function ChatInterface({ onLogout, messages, setMessages, chatTitle, setChatTitle, userKey }) {
    // `chatTitle` is passed in from the parent (e.g. AppContent),
    // so we can store it in state at a higher level, or keep it local. 
    // Here we assume it’s state-lifted so you can reset it from “new chat.”

    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [file, setFile] = useState(null);

    // Chat title + editing states
    const { theme } = useContext(ThemeContext);
    const fileInputRef = useRef(null);

    // Track if we've generated a title yet for this conversation
    const [hasGeneratedTitle, setHasGeneratedTitle] = useState(false);

    /**
     * Called after we receive the bot’s response. If chatTitle is empty,
     * we generate a title from the user’s first message, then store it in DB.
     */
    const maybeGenerateTitle = async (updatedMessages) => {
        if (!hasGeneratedTitle) {
            try {
                // The first user message is at updatedMessages[0], if you place system messages aside.
                // But your code might differ, so adjust accordingly. 
                // We'll call generateChatTitle with the user’s first message. 
                const title = await generateChatTitle(updatedMessages.filter(m => m.role === 'user'));

                // Store it in React state
                setChatTitle(title);
                setHasGeneratedTitle(true);

                // Also call your rename endpoint to store it on server, e.g.:
                // 
                //   axios.post('/renameChat', {
                //     userKey,
                //     chatId: "singleSession_" + userKey, // or however you do it
                //     newTitle: title
                //   });
                // 
                await axios.post('/renameChat', {
                    userKey,
                    chatId: 'singleSession_' + userKey, // adjust if you have multiple chat IDs
                    newTitle: title
                });

            } catch (err) {
                console.error('Error auto-generating chat title:', err);
            }
        }
    };

    // Send the user’s message
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
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                res = await axios.post('/chat', { userMessage: userInput, userKey });
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

            // Attempt to generate a title if we haven’t yet
            // We'll pass in the entire updated conversation for context
            const updatedConversation = [...messages, userMsg, botMsg];
            await maybeGenerateTitle(updatedConversation);

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

    // Filter out system messages
    const filteredMessages = messages.filter(m => m.role !== 'system');
    const showStartContent = filteredMessages.length === 0 && !isLoading;

    // If user manually edits chat title (the "pencil" icon), call rename endpoint
    const handleTitleEdit = async () => {
        const newTitle = prompt('Enter new chat title:', chatTitle || '');
        if (newTitle && newTitle.trim() !== '') {
            // Locally set
            setChatTitle(newTitle.trim());
            // Optionally rename on server
            try {
                await axios.post('/renameChat', {
                    userKey,
                    chatId: 'singleSession_' + userKey,
                    newTitle: newTitle.trim()
                });
            } catch (err) {
                console.error('Error renaming chat on server:', err);
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-visible">
            {/* Title row (only if there's any conversation) */}
            {(filteredMessages.length > 0 || isLoading) && (
                <div className="px-4 py-2 mb-2 flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-blue-400">
                        Chat Title: {chatTitle || 'Untitled Chat'}
                    </h2>
                    {/* Pencil icon for editing */}
                    <button onClick={handleTitleEdit} title="Edit Title">
                        <i className="fa-light fa-pen-to-square text-gray-300 hover:text-gray-100"></i>
                    </button>
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
                            className={`fa-solid fa-paperclip ${theme === 'dark' ? 'text-white' : 'text-black'} w-5 h-5`}
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
                            className={`text-sm truncate max-w-xs ${theme === 'dark' ? 'text-white' : 'text-black'}`}
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
                    className={`flex-1 p-6 rounded text-black ${theme === 'dark' ? '' : 'border border-gray-500'}
            resize-none overflow-y-auto whitespace-pre-wrap`}
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