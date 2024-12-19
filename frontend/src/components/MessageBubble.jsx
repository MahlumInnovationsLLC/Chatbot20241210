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
        // Inside components.a
        a({ href, children, ...props }) {
            if (href && href.startsWith('download://')) {
                const fileName = href.replace('download://', '');
                const fileUrl = `/api/generateReport?filename=${encodeURIComponent(fileName)}`;
                return (
                    <button
                        className="text-blue-500 underline hover:text-blue-700"
                        onClick={async (e) => {
                            e.preventDefault();
                            const res = await fetch(fileUrl);
                            if (!res.ok) {
                                alert("Failed to download file.");
                                return;
                            }
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }}
                        {...props}
                    >
                        {children}
                    </button>
                );
            }
            return <a href={href} className="text-blue-500 underline hover:text-blue-700" {...props}>{children}</a>;
        }
    };

    const [showReferences, setShowReferences] = useState(false);
    let mainContent = content;
    let referencesSection = null;
    const referencesIndex = content.indexOf("References:");

    if (referencesIndex !== -1) {
        mainContent = content.substring(0, referencesIndex).trim();
        referencesSection = content.substring(referencesIndex).trim();
    }

    return (
        <div className={`mb-2 p-3 rounded-md ${isUser ? 'bg-blue-700 text-white self-end' : 'bg-gray-700 text-white self-start'}`}>
            <p className="text-sm font-bold mb-2">{isUser ? 'You' : 'AI Engine'}:</p>
            <ReactMarkdown
                className="prose prose-invert max-w-none"
                remarkPlugins={[remarkGfm, remarkBreaks]}
                transformLinkUri={null}
                components={components}
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
                                transformLinkUri={null}
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
