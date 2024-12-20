// ChatInterface.jsx
import React, { useState, useContext, useRef } from 'react';
import axios from 'axios';
import MessageBubble from './MessageBubble';
import ThinkingBubble from './ThinkingBubble';
import { ThemeContext } from '../ThemeContext';

export default function ChatInterface({ onLogout }) {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');

    const { theme } = useContext(ThemeContext);
    const fileInputRef = useRef(null);

    const sendMessage = async () => {
        if (!userInput.trim()) return;
        const userMsg = { role: 'user', content: userInput };
        setMessages(prev => [...prev, userMsg]);
        setUserInput('');

        setIsLoading(true);

        try {
            const res = await axios.post('/chat', { userMessage: userInput });
            const botMsg = { role: 'assistant', content: res.data.reply };

            // If the server returns references, add them to the botMsg
            if (res.data.references) {
                botMsg.references = res.data.references;
            }

            // If the server returns downloadUrl and reportContent, store them
            if (res.data.downloadUrl && res.data.reportContent) {
                botMsg.downloadUrl = res.data.downloadUrl;
                botMsg.reportContent = res.data.reportContent;
            }

            setMessages(prev => [...prev, botMsg]);
        } catch (e) {
            console.error(e);
            const errorMsg = { role: 'assistant', content: 'Error occurred: ' + e.message };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
        } else {
            setFileName('');
        }
    };

    // This function handles downloading the report by POSTing the reportContent to downloadUrl
    const onDownload = async (downloadUrl, reportContent) => {
        if (!downloadUrl || !reportContent) return;
        try {
            const res = await axios.post(downloadUrl, { reportContent }, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'report.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading report:', err);
        }
    };

    const showStartContent = messages.length === 0 && !isLoading;

    return (
        <div className="w-full h-full flex flex-col relative overflow-visible">
            <div className="flex-grow overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-gray-700 p-4 rounded-md border border-gray-500 relative">
                {showStartContent && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <img src="https://gymaidata.blob.core.windows.net/gymaiblobstorage/loklen1.png" alt="Center Logo" className="h-16 w-auto mb-4" />
                        <h2 className="text-3xl mb-2 font-bold">Start chatting</h2>
                        <p className="text-sm text-gray-300">
                            I am here to help! How can I support you today?
                        </p>
                    </div>
                )}
                {!showStartContent && (
                    <>
                        {messages.map((m, i) => (
                            <MessageBubble
                                key={i}
                                role={m.role}
                                content={m.content}
                                references={m.references}
                                downloadUrl={m.downloadUrl}
                                reportContent={m.reportContent}
                                onDownload={onDownload}
                            />
                        ))}
                        {isLoading && <ThinkingBubble />}
                    </>
                )}
            </div>
            <div className="flex space-x-2 items-end px-4 pb-4">
                <div className="relative flex items-center space-x-2">
                    <button
                        onClick={handleFileClick}
                        className="p-2 focus:outline-none"
                        title="Attach a file"
                    >
                        <i className={`fa-solid fa-paperclip ${theme === 'dark' ? 'text-white' : 'text-black'} w-5 h-5`}></i>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    {fileName && (
                        <span className={`text-sm truncate max-w-xs ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            {fileName}
                        </span>
                    )}
                </div>

                <textarea
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    wrap="soft"
                    className={`flex-1 p-6 rounded text-black ${theme === 'dark' ? '' : 'border border-gray-500'} resize-none overflow-y-auto whitespace-pre-wrap`}
                    placeholder="I'm here to help! Ask me anything..."
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Send
                </button>
            </div>
        </div>
    );
}