import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function MessageBubble({ role, content, references, downloadUrl }) {
    const isUser = role === 'user';

    console.log("MessageBubble:", { role, content, references, downloadUrl });

    let mainContent = content || '';
    let referencesSection = null;
    const referencesIndex = mainContent.indexOf("References:");

    if (referencesIndex !== -1) {
        referencesSection = mainContent.substring(referencesIndex).trim();
        mainContent = mainContent.substring(0, referencesIndex).trim();
    }

    // Remove `download://report.docx` if present
    if (mainContent.includes('download://report.docx')) {
        mainContent = mainContent.replace('download://report.docx', '').trim();
    }

    // Remove unwanted links that point to the webapp URL
    const webAppUrlPattern = /\[([^\]]+)\]\((https?:\/\/gymaiengine\.com[^\)]*)\)/gi;
    mainContent = mainContent.replace(webAppUrlPattern, '');

    // Remove system messages from the content
    const systemMessagePattern = /You are a helpful assistant[\s\S]*?References: None/gi;
    mainContent = mainContent.replace(systemMessagePattern, '').trim();

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

    // Function to handle the download button click using fetch and blob
    const handleDownload = async () => {
        if (!downloadUrl) return;
        try {
            const res = await fetch(downloadUrl);
            if (!res.ok) {
                console.error("Failed to fetch the report:", res.statusText);
                alert("Failed to download the report.");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'report.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Download error:", e);
            alert("Error occurred while downloading the file.");
        }
    };

    console.log("Final content mainContent:", mainContent);
    console.log("Final content referencesSection:", referencesSection);
    console.log("MessageBubble: references:", references);
    console.log("MessageBubble: downloadUrl:", downloadUrl);

    // Only show references if we have them and references is a non-empty array
    const hasRelevantReferences = references && references.length > 0;

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

            {hasRelevantReferences && (
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