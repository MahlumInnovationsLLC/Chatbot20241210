// ChatInterface.jsx
import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';
import { ThemeContext } from '../ThemeContext';

/**
 * This helper can call your server to create a short, descriptive title
 * from the user’s first message. Or you can expand it for multiple messages.
 */
async function generateChatTitle(messages) {
    try {
        // For demonstration: consider the FIRST user message
        const snippet = messages.slice(0, 1);
        const requestBody = {
            messages: [
                {
                    role: 'system',
                    content: `You are an assistant that creates short, descriptive conversation titles. (3-6 words, no quotes).`
                },
                ...snippet,
                {
                    role: 'user',
                    content: 'Please provide a concise, descriptive title for this conversation.'
                }
            ],
            // or your Azure deployment name
            model: 'YOUR_OPENAI_MODEL'
        };
        const response = await axios.post('/generateChatTitle', requestBody);
        return response.data.title || 'Untitled Chat';
    } catch (err) {
        console.error('Error generating chat title:', err);
        return 'Untitled Chat';
    }
}

export default function ChatInterface({
    onLogout,
    userKey,
    chatId, // unique chat doc ID
    messages,
    setMessages,
    chatTitle,
    setChatTitle
}) {
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Instead of single file/fileName, store multiple
    const [files, setFiles] = useState([]);
    const [fileNames, setFileNames] = useState([]);

    // Once we generate a title, we won't do it again
    const [hasGeneratedTitle, setHasGeneratedTitle] = useState(false);

    const { theme } = useContext(ThemeContext);
    const fileInputRef = useRef(null);

    /**
     * Called after receiving the bot’s response. If we have no chat title yet,
     * we try to generate it from the user’s first message, then rename on server.
     */
    const maybeGenerateTitle = async (updatedMessages) => {
        if (!hasGeneratedTitle) {
            try {
                const userMessages = updatedMessages.filter((m) => m.role === 'user');
                const title = await generateChatTitle(userMessages);
                if (setChatTitle) setChatTitle(title);
                setHasGeneratedTitle(true);

                // Rename the doc in your DB, passing the actual chatId
                await axios.post('/renameChat', {
                    userKey,
                    chatId,
                    newTitle: title
                });
            } catch (err) {
                console.error('Error auto-generating chat title:', err);
            }
        }
    };

    const sendMessage = async () => {
        if (!userInput.trim() && files.length === 0) return;

        // 1) put user message in local conversation
        const userMsg = {
            role: 'user',
            content: userInput,
            // Step 1. If we want the UI to show which files user just attached
            attachedFiles: files.map((f) => ({
                filename: f.name,
                // The server will eventually set the blobUrl
                blobUrl: '',
                fileExt: 'other'
            }))
        };

        setMessages((prev) => [...prev, userMsg]);
        setUserInput('');
        setIsLoading(true);

        try {
            let res;
            if (files.length > 0) {
                // multi-part form
                const formData = new FormData();
                formData.append('userMessage', userInput);
                // pass chatId as a hidden field
                formData.append('chatId', chatId);

                files.forEach((f) => {
                    formData.append('file', f, f.name);
                });

                res = await axios.post('/chat', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                // no files => send normal JSON
                res = await axios.post('/chat', {
                    userMessage: userInput,
                    userKey,
                    chatId
                });
            }

            // the response
            const botMsg = {
                role: 'assistant',
                content: res.data.reply,
                references: res.data.references,
                downloadUrl: res.data.downloadUrl,
                reportContent: res.data.reportContent,
                // Step 2. The server might not directly pass "files" here
                // but if you want to attach them to the AI message, do so:
                attachedFiles: []
            };
            setMessages((prev) => [...prev, botMsg]);

            // Possibly generate a conversation title
            const updatedConversation = [...messages, userMsg, botMsg];
            await maybeGenerateTitle(updatedConversation);
        } catch (err) {
            console.error(err);
            const errorMsg = { role: 'assistant', content: 'Error: ' + err.message };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
            // Clear file states
            setFiles([]);
            setFileNames([]);
        }
    };

    // Press Enter => send
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    // For the paperclip icon
    const handleFileClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    // For multiple files
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles((prev) => [...prev, ...selectedFiles]);
            const newNames = selectedFiles.map((f) => f.name);
            setFileNames((prev) => [...prev, ...newNames]);
        }
    };

    // We hide system messages in the UI
    const filteredMessages = messages.filter((m) => m.role !== 'system');
    const showStartContent = filteredMessages.length === 0 && !isLoading;

    // Let user rename the chat manually
    const handleTitleEdit = async () => {
        const newTitle = prompt('Enter new chat title:', chatTitle || '');
        if (newTitle && newTitle.trim() !== '') {
            if (setChatTitle) setChatTitle(newTitle.trim());
            try {
                await axios.post('/renameChat', {
                    userKey,
                    chatId,
                    newTitle: newTitle.trim()
                });
            } catch (err) {
                console.error('Error renaming chat on server:', err);
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative overflow-visible">
            {/* If conversation has started, show the chat title + pencil */}
            {(filteredMessages.length > 0 || isLoading) && (
                <div className="px-4 py-2 mb-2 flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-blue-400">
                        Chat Title: {chatTitle || 'Untitled Chat'}
                    </h2>
                    <button onClick={handleTitleEdit} title="Edit Title">
                        <i className="fa-light fa-pen-to-square text-gray-300 hover:text-gray-100"></i>
                    </button>
                </div>
            )}

            {/* The scrollable chat window */}
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
                                // Step 3: pass m.attachedFiles if present
                                files={m.attachedFiles || []}
                            />
                        ))}
                        {isLoading && <ThinkingBubble />}
                    </>
                )}
            </div>

            {/* Bottom input area */}
            <div className="flex space-x-2 items-end px-4 pb-4">
                {/* Paperclip for multiple files */}
                <div className="relative flex items-center space-x-2">
                    <button
                        onClick={handleFileClick}
                        className="p-2 focus:outline-none"
                        title="Attach files"
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
                        multiple
                        onChange={handleFileChange}
                    />
                    {/* Show multiple file names */}
                    {fileNames.length > 0 && (
                        <div className="flex flex-col space-y-1 max-w-xs">
                            {fileNames.map((name, idx) => (
                                <span
                                    key={idx}
                                    className={`text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-black'
                                        }`}
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
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