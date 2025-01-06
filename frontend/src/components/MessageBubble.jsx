import React, { useContext, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { FaFilePdf, FaFileWord, FaFileImage } from 'react-icons/fa';
import { AiFillFileUnknown } from 'react-icons/ai';
import { ThemeContext } from '../ThemeContext'; // Import ThemeContext
import '../styles/MessageBubble.css'; // Import the CSS file

export default function MessageBubble({
    role,
    content,
    references,
    downloadUrl,
    reportContent,
    files = [] // keep default empty array if none
}) {
    const { theme } = useContext(ThemeContext);
    const isUser = role === 'user';
    const [displayedContent, setDisplayedContent] = useState('');
    const [isTyping, setIsTyping] = useState(role === 'assistant');

    useEffect(() => {
        if (isTyping) {
            let currentIndex = 0;
            const typingSpeed = 0.5; // Adjust typing speed (ms per character)

            const typeNextCharacter = () => {
                if (currentIndex < content.length) {
                    setDisplayedContent((prev) => prev + content[currentIndex]);
                    currentIndex++;
                    setTimeout(typeNextCharacter, typingSpeed);
                } else {
                    setIsTyping(false);
                }
            };

            typeNextCharacter();
        } else {
            setDisplayedContent(content);
        }
    }, [content, isTyping]);

    console.log('MessageBubble:', {
        role,
        content,
        references,
        downloadUrl,
        reportContent,
        files
    });

    let mainContent = displayedContent || '';
    let referencesSection = null;
    const referencesIndex = mainContent.indexOf('References:');

    if (referencesIndex !== -1) {
        referencesSection = mainContent.substring(referencesIndex).trim();
        mainContent = mainContent.substring(0, referencesIndex).trim();
    }

    const [showReferences, setShowReferences] = useState(false);

    // Code block syntax highlighting
    const components = {
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
                <SyntaxHighlighter
                    style={github}
                    language={match ? match[1] : undefined}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
        ul({ children }) {
            return <ul className="list-disc list-outside pl-5">{children}</ul>;
        },
        ol({ children }) {
            return <ol className="list-decimal list-outside pl-5">{children}</ol>;
        },
        a({ href, children, ...props }) {
            console.log('Normal link href:', href);
            return (
                <a href={href} className="text-blue-500 underline hover:text-blue-700" {...props}>
                    {children}
                </a>
            );
        }
    };

    console.log('Final content mainContent:', mainContent);
    console.log('Final content referencesSection:', referencesSection);
    console.log('MessageBubble: references:', references);
    console.log('MessageBubble: downloadUrl:', downloadUrl);

    const hasRelevantReferences = references && references.length > 0;

    // Simple helper to guess if file is an image
    const isImageFile = (fileObj) => {
        if (fileObj.fileExt === 'image') return true;
        const fname = (fileObj.filename || '').toLowerCase();
        return (
            fname.endsWith('.png') ||
            fname.endsWith('.jpg') ||
            fname.endsWith('.jpeg') ||
            fname.endsWith('.gif') ||
            fname.endsWith('.webp')
        );
    };

    // Renders a mini preview or icon link for a single file
    const renderFilePreview = (fileObj, idx) => {
        // If image, show thumbnail
        if (isImageFile(fileObj)) {
            return (
                <div key={idx} className="mr-2 mb-2">
                    <img
                        src={fileObj.blobUrl}
                        alt={fileObj.filename}
                        className="w-24 h-auto rounded border border-gray-500"
                    />
                    <p className="text-xs mt-1 truncate">{fileObj.filename}</p>
                </div>
            );
        }

        // If PDF
        if (fileObj.fileExt === 'pdf' || (fileObj.filename || '').toLowerCase().endsWith('.pdf')) {
            return (
                <div key={idx} className="mr-2 mb-2 flex items-center space-x-1">
                    <FaFilePdf className="text-red-500" />
                    <a
                        href={fileObj.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-xs"
                    >
                        {fileObj.filename}
                    </a>
                </div>
            );
        }

        // If DOCX
        if (
            fileObj.fileExt === 'docx' ||
            (fileObj.filename || '').toLowerCase().match(/\.(docx|doc)$/i)
        ) {
            return (
                <div key={idx} className="mr-2 mb-2 flex items-center space-x-1">
                    <FaFileWord className="text-blue-400" />
                    <a
                        href={fileObj.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-xs"
                    >
                        {fileObj.filename}
                    </a>
                </div>
            );
        }

        // Otherwise unknown
        return (
            <div key={idx} className="mr-2 mb-2 flex items-center space-x-1">
                <AiFillFileUnknown className="text-gray-300" />
                <a
                    href={fileObj.blobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-xs"
                >
                    {fileObj.filename}
                </a>
            </div>
        );
    };

    return (
        <div
            className={`message-bubble mb-2 p-3 rounded-md ${isUser ? 'user' : 'assistant'} ${theme === 'dark' ? '' : 'light-mode'
                }`}
        >
            <p className="text-sm font-bold mb-2">{isUser ? 'You' : 'AI Engine'}:</p>

            {/* If this message has files, show them above the text */}
            {files && files.length > 0 && (
                <div className="flex flex-wrap mb-3">
                    {files.map((fileObj, i) => renderFilePreview(fileObj, i))}
                </div>
            )}

            {/* Wrap the markdown content in a .message-content div so the CSS can apply */}
            <div className="message-content">
                <ReactMarkdown
                    className="prose prose-invert max-w-none"
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    transformLinkUri={null}
                    components={components}
                >
                    {mainContent}
                </ReactMarkdown>
            </div>

            {/* If references are present, show/hide them with a button */}
            {hasRelevantReferences && (
                <div className="mt-2">
                    <button
                        className="text-sm text-blue-400 underline hover:text-blue-600"
                        onClick={() => setShowReferences(!showReferences)}
                    >
                        {showReferences ? 'Hide References' : 'Show References'}
                    </button>
                    {showReferences && (
                        <div className="mt-2 p-2 rounded bg-gray-600 text-white">
                            <ReactMarkdown
                                className="prose prose-invert max-w-none text-sm"
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                transformLinkUri={null}
                            >
                                {referencesSection}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            )}

            {/* If there's a downloadable docx link */}
            {downloadUrl && (
                <div className="download-link mt-4">
                    <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                        Click here to download the document
                    </a>
                </div>
            )}
        </div>
    );
}