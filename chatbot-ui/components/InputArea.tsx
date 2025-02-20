// components/InputArea.tsx
type InputAreaProps = {
    prompt: string;
    setPrompt: (value: string) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isConnected: boolean;
  };
  
  export default function InputArea({ prompt, setPrompt, handleSubmit, isConnected }: InputAreaProps) {
    return (
      <footer className="p-4 shadow-md">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex">
          <input
            type="text"
            placeholder="Type your prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 p-4 rounded-l-lg border-none outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={isConnected}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-r-lg disabled:opacity-50"
          >
            {isConnected ? "Waiting..." : "Send"}
          </button>
        </form>
      </footer>
    );
  }
  