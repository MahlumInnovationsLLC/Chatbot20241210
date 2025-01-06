/*****************************************************************************
 * ChatInterface.jsx
 *****************************************************************************/
import React, { useState, useContext, useRef, useEffect } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import { ThemeContext } from '../ThemeContext';
import '../styles/ChatInterface.css'; // Ensure the path to the styles folder is correct
import LoadingCircle from './LoadingCircle'; // Import LoadingCircle
import '../styles/MessageBubble.css'; // Import the CSS file

/**
 * Helper to generate a short, descriptive title from the user’s first message.
 */
async function generateChatTitle(messages) {
    try {
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
    chatId,           // unique doc ID for cosmos
    messages,
    setMessages,
    chatTitle,
    setChatTitle,
    // optionally pass a callback so this component can inform the parent of a new chatId
    onChatIdUpdate
}) {
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // For attachments
    const [files, setFiles] = useState([]);
    const [fileNames, setFileNames] = useState([]);

    // For auto-titling
    const [hasGeneratedTitle, setHasGeneratedTitle] = useState(false);

    // For "stop" functionality
    const abortControllerRef = useRef(null);

    const { theme } = useContext(ThemeContext);
    const fileInputRef = useRef(null);

    // Reference for the chat window
    const chatWindowRef = useRef(null);

    /**
     * Possibly rename chat once we receive the first user message & bot reply.
     */
    const maybeGenerateTitle = async (updatedMessages) => {
        if (!hasGeneratedTitle) {
            try {
                const userMessages = updatedMessages.filter((m) => m.role === 'user');
                const title = await generateChatTitle(userMessages);
                if (setChatTitle) setChatTitle(title);
                setHasGeneratedTitle(true);

                // rename doc in backend
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

    /**
     * Send the user's message (and files, if any) to the server.
     */
    const sendMessage = async () => {
        if (!userInput.trim() && files.length === 0) return;

        // 1) Add user’s message to local
        const userMsg = {
            role: 'user',
            content: userInput,
            attachedFiles: files.map((f) => ({
                filename: f.name,
                blobUrl: '',
                fileExt: 'other'
            }))
        };
        setMessages((prev) => [...prev, userMsg]);
        setUserInput('');
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
            let res;
            if (files.length > 0) {
                // multi-part form
                const formData = new FormData();
                formData.append('userMessage', userInput);
                formData.append('chatId', chatId);
                files.forEach((f) => {
                    formData.append('file', f, f.name);
                });

                res = await axios.post('/chat', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    signal: abortControllerRef.current.signal
                });
            } else {
                // JSON approach
                res = await axios.post(
                    '/chat',
                    {
                        userMessage: userInput,
                        userKey,
                        chatId
                    },
                    {
                        signal: abortControllerRef.current.signal
                    }
                );
            }

            // 2) Bot’s reply placeholder
            const botMsg = {
                role: 'assistant',
                content: '',
                references: res.data.references,
                downloadUrl: res.data.downloadUrl,
                reportContent: res.data.reportContent,
                attachedFiles: []
            };
            setMessages((prev) => [...prev, botMsg]);

            // Typing effect for bot's reply
            const typingSpeed = 0.5; // ms per character
            const fullContent = res.data.reply;
            let currentIndex = 0;

            const typeNextCharacter = () => {
                // If user pressed Stop
                if (abortControllerRef.current.signal.aborted) {
                    // finalize the content immediately
                    botMsg.content = fullContent;
                    setMessages((prev) => [...prev.slice(0, -1), botMsg]);
                    setIsLoading(false); // done
                    return;
                }

                // Otherwise continue typing
                if (currentIndex < fullContent.length) {
                    botMsg.content += fullContent[currentIndex];
                    setMessages((prev) => [...prev.slice(0, -1), botMsg]);
                    currentIndex++;
                    setTimeout(typeNextCharacter, typingSpeed);
                } else {
                    // Once the bot finishes typing everything, hide the stop button
                    setIsLoading(false);
                }
            };

            // IMPORTANT: we do NOT set isLoading(false) here. We remain "loading"
            // so that the "Stop" button is shown during the entire typing sequence.
            // Start the typing animation:
            typeNextCharacter();

            // 2a) If the server returns a brand-new chatId (for instance, auto-generated),
            // notify parent if onChatIdUpdate is provided.
            if (res.data.chatId && res.data.chatId !== chatId) {
                console.log('Server returned a new chatId:', res.data.chatId);
                if (onChatIdUpdate) {
                    onChatIdUpdate(res.data.chatId);
                }
            }

            // 3) Possibly generate a conversation title
            const updatedConversation = [...messages, userMsg, botMsg];
            await maybeGenerateTitle(updatedConversation);

        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Request canceled:', err.message);
            } else {
                console.error('Error sending message:', err);
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: 'Error: ' + err.message }
                ]);
            }
            setIsLoading(false);
        } finally {
            setFiles([]);
            setFileNames([]);
        }
    };

    // Handle "Stop" clicked
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    // Press Enter => send
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    // Show file picker
    const handleFileClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    // Multiple files
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles((prev) => [...prev, ...selectedFiles]);
            const newNames = selectedFiles.map((f) => f.name);
            setFileNames((prev) => [...prev, ...newNames]);
        }
    };

    // Filter out system messages
    const filteredMessages = messages.filter((m) => m.role !== 'system');
    const showStartContent = filteredMessages.length === 0 && !isLoading;

    /**
     * Let user rename the chat manually.
     */
    const handleTitleEdit = async () => {
        const newTitle = prompt('Enter new chat title:', chatTitle || '');
        if (newTitle && newTitle.trim() !== '') {
            try {
                await axios.post('/renameChat', {
                    userKey,
                    chatId,
                    newTitle: newTitle.trim()
                });

                if (setChatTitle) {
                    setChatTitle(newTitle.trim());
                }
            } catch (err) {
                console.error('Error renaming chat on server:', err);
            }
        }
    };

    // Scroll to the bottom of the chat window
    const scrollToBottom = () => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    };

    // Scroll to the bottom whenever messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    /**************************************************************************
     * Render
     **************************************************************************/
    return (
        <div className={`w-full h-full flex flex-col relative overflow-visible ${theme === 'dark' ? 'dark-mode' : 'light-mode'}`}>
            {/* Title row if there's a conversation beyond system or if loading */}
            {(filteredMessages.length > 0 || isLoading) && (
                <div className="px-4 py-2 mb-2 flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-blue-400">
                        {chatTitle || 'Untitled Chat'}
                    </h2>
                    <button onClick={handleTitleEdit} title="Edit Title">
                        <i className="fa-light fa-pen-to-square text-gray-300 hover:text-gray-100"></i>
                    </button>
                </div>
            )}

            {/* Scrollable chat window */}
            <div
                ref={chatWindowRef}
                className="chat-window flex-grow overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700 p-4 rounded-md border border-gray-500 relative"
            >
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
                                files={m.attachedFiles || []}
                            />
                        ))}
                        {isLoading && (
                            <div className="flex justify-center items-center mt-4">
                                <LoadingCircle />
                            </div>
                        )}
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
                {!isLoading && (
                    <button
                        onClick={sendMessage}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        title="Send message"
                    >
                        <i className="fa-light fa-paper-plane"></i>
                    </button>
                )}

                {isLoading && (
                    <button
                        onClick={handleStop}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        title="Stop generating response"
                    >
                        <i className="fa-light fa-stop"></i>
                    </button>
                )}
            </div>
        </div>
    );
}