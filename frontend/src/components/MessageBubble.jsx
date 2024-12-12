import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MessageBubble({ role, content }) {
    const isUser = role === 'user';

    // Custom component to render code blocks with syntax highlighting
    const renderers = {
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
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
        }
    };

    return (
        <div className={`mb-2 p-2 rounded max-w-[80%] ${isUser ? 'bg-blue-700 text-white self-end' : 'bg-gray-700 text-white self-start'}`}>
            <div className="text-sm mb-1">
                <strong>{isUser ? 'You' : 'Bot'}</strong>:
            </div>
            <ReactMarkdown
                className="prose prose-invert"
                remarkPlugins={[remarkGfm]}
                components={renderers}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}