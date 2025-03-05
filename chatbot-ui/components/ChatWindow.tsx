// components/ChatWindow.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

type ChatMessage = {
  role: "user" | "bot";
  content: string;
};

type ChatWindowProps = {
  conversations: ChatMessage[];
  containerRef: React.RefObject<HTMLDivElement>;
  theme: "dark" | "light";
  onScroll: (isAtBottom: boolean) => void;
};

const MarkdownRender = ({ content, theme }: { content: string; theme: "dark" | "light" }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match) {
            return (
              <SyntaxHighlighter
                style={theme === "dark" ? vscDarkPlus : {}}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }
          return (
            <code className={`bg-gray-200 dark:bg-gray-800 p-1 rounded ${className || ''}`} {...props}>
              {children}
            </code>
          );
        },
        ul({ node, ...props }) {
          return <ul className="list-disc ml-5" {...props} />;
        },
        ol({ node, ...props }) {
          return <ol className="list-decimal ml-5" {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function ChatWindow({ conversations, containerRef, theme, onScroll }: ChatWindowProps) {
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
      onScroll(isAtBottom);
    }
  };

  return (
    <main className="flex-1 p-4 overflow-y-auto" ref={containerRef} onScroll={handleScroll}>
      {/* Changed max-w-3xl to max-w-5xl for a wider container */}
      <div className="max-w-5xl mx-auto space-y-4">
        {conversations.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              // Changed max-w-xs md:max-w-md to max-w-md md:max-w-lg for wider message bubbles
              className={`rounded-lg p-4 max-w-md md:max-w-4xl break-words shadow-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : theme === "dark"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.role === "bot" ? (
                <MarkdownRender content={msg.content} theme={theme} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
