import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function MessageBubble({ role, content, references, downloadUrl }) {
    const isUser = role === 'user';

    console.log("MessageBubble:", { role, content, references, downloadUrl });

    // Before rendering, remove any unwanted links leading to the webapp base URL if needed
    // Example: If links to "https://gymaiengine.com" appear, remove them.
    // We'll just remove that line if found in mainContent:
    let filteredContent = content || '';

    // If there's a link pattern like [text](https://gymaiengine.com), remove it
    const webAppUrlPattern = /\[([^\]]+)\]\((https?:\/\/gymaiengine\.com[^\)]*)\)/gi;
    filteredContent = filteredContent.replace(webAppUrlPattern, '');

    let mainContent = filteredContent;
    let referencesSection = null;
    const referencesIndex = mainContent.indexOf("References:");

    if (referencesIndex !== -1) {
        referencesSection = mainContent.substring(referencesIndex).trim();
        mainContent = mainContent.substring(0, referencesIndex).trim();
    }

    const [showReferences, setShowReferences] = useState(false);

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
            console.log("Normal link href:", href);
            return (
                <a href={href} className="text-blue-500 underline hover:text-blue-700" {...props}>
                    {children}
                </a>
            );
        }
    };

    // Function to handle the actual download via the downloadUrl
    const handleDownload = () => {
        if (!downloadUrl) return;
        // Append the content as a query param to the downloadUrl
        const finalDownloadUrl = `${downloadUrl}&content=${encodeURIComponent(mainContent + (referencesSection ? '\n\n' + referencesSection : ''))}`;
        const a = document.createElement('a');
        a.href = finalDownloadUrl;
        a.download = 'report.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    console.log("Final content mainContent:", mainContent);
    console.log("Final content referencesSection:", referencesSection);
    console.log("MessageBubble: references:", references);
    console.log("MessageBubble: downloadUrl:", downloadUrl);

    return (
        <div
            className={`mb-2 p-3 rounded-md ${isUser ? 'bg-blue-700 text-white self-end' : 'bg-gray-700 text-white self-start'}`}
        >
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

            {downloadUrl && (
                <div className="mt-4">
                    {/* Replace text link with a button */}
                    <button
                        onClick={handleDownload}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Download the Report
                    </button>
                </div>
            )}
        </div>
    );
}