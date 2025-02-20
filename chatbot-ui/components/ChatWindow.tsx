// components/ChatWindow.tsx
import React from 'react'; // Import React

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
      <div className="max-w-3xl mx-auto space-y-4">
        {conversations.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`rounded-lg p-4 max-w-xs md:max-w-md break-words shadow-lg ${
                msg.role === "user"
                  ? "bg-blue-600 text-white" // Slightly darker blue
                  : theme === "dark"
                  ? "bg-gray-700 text-white" // Lighter gray
                  : "bg-gray-100 text-gray-900" // Lighter gray
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}