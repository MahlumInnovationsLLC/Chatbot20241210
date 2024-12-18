import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function MessageBubble({ role, content }) {
    const isUser = role === 'user';

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
            // If href starts with download://, convert it into a direct download link.
            if (href && href.startsWith('download://')) {
                const fileName = href.replace('download://', '');
                const fileUrl = `/api/generateReport?filename=${encodeURIComponent(fileName)}`;

                return (
                    <a
                        href={fileUrl}
                        download={fileName} // This triggers a direct download.
                        className="text-blue-500 underline hover:text-blue-700"
                        {...props}
                    >
                        {children}
                    </a>
                );
            }

            // Otherwise, render a normal link
            return (
                <a href={href} className="text-blue-500 underline hover:text-blue-700" {...props}>
                    {children}
                </a>
            );
        }
    };

    // State to control showing references
    const [showReferences, setShowReferences] = useState(false);

    // Check if there's a "References:" section
    let mainContent = content;
    let referencesSection = null;
    const referencesIndex = content.indexOf("References:");

    if (referencesIndex !== -1) {
        mainContent = content.substring(0, referencesIndex).trim();
        referencesSection = content.substring(referencesIndex).trim();
    }

    return (
        <div
            className={`mb-2 p-3 rounded-md ${isUser ? 'bg-blue-700 text-white self-end' : 'bg-gray-700 text-white self-start'}`}
        >
            <p className="text-sm font-bold mb-2">{isUser ? 'You' : 'AI Engine'}:</p>
            <ReactMarkdown
                className="prose prose-invert max-w-none"
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={components}
                transformLinkUri={(uri) => {
                    // Keep the custom download:// URI intact for handling above.
                    if (uri.startsWith('download://')) {
                        return uri;
                    }
                    // Fallback to default transform
                    return ReactMarkdown.uriTransformer(uri);
                }}
            >
                {mainContent}
            </ReactMarkdown>

            {referencesSection && (
                <div className="mt-2">
                    <button
                        className="text-sm text-blue-400 underline hover:text-blue-600"
                        onClick={() => setShowReferences(!showReferences)}
                    >
                        {showReferences ? "Hide References" : "Show References"}
                    </button>
                    {showReferences && (
                        <div className="mt-2 p-2 rounded bg-gray-600 text-white">
                            <ReactMarkdown
                                className="prose prose-invert max-w-none text-sm"
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                            >
                                {referencesSection}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}