// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import ChatWindow from "../components/ChatWindow";
import InputArea from "../components/InputArea";
import SettingsPanel from "../components/SettingsPanel";
import { FaArrowDown } from "react-icons/fa";

type ChatMessage = {
  role: "user" | "bot";
  content: string;
};

function mergeToken(current: string, token: string): string {
  let maxOverlap = 0;
  const len = Math.min(current.length, token.length);
  for (let i = 1; i <= len; i++) {
    if (current.slice(-i) === token.slice(0, i)) {
      maxOverlap = i;
    }
  }
  return current + token.slice(maxOverlap);
}

export default function ChatPage() {
  const [maxTokens, setMaxTokens] = useState<number>(512);
  const [temperature, setTemperature] = useState<number>(0.0);
  const [topK, setTopK] = useState<number>(1);
  const [topP, setTopP] = useState<number>(0.95);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number>(1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState<number>(0.0);
  const [presencePenalty, setPresencePenalty] = useState<number>(0.0);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [prompt, setPrompt] = useState("");
  const [conversations, setConversations] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pendingBotMessageRef = useRef<string>("");
  const updateScheduledRef = useRef<boolean>(false);
  const userInterruptedScroll = useRef<boolean>(false); // Track if user manually scrolled

  

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const profiles = [
    {
      name: "Less helu",
      maxTokens: 1024,
      temperature: 0.1,
      topK: 40,
      topP: 0.9,
      repetitionPenalty: 1.1,
      frequencyPenalty: 0.05,
      presencePenalty: 0.05,
    },
    {
      name: "Default",
      maxTokens: 1024,
      temperature: 0.0,
      topK: 40,
      topP: 0.95,
      repetitionPenalty: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
    },
    {
      name: "Creative",
      maxTokens: 1024,
      temperature: 0.55,
      topK: 50,
      topP: 0.8,
      repetitionPenalty: 1.1,
      frequencyPenalty: 0.1,
      presencePenalty: 0.05,
    },
  ];

  // Track which profile is active
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);


  const switchToProfile = (index: number) => {
    const p = profiles[index];
    setMaxTokens(p.maxTokens);
    setTemperature(p.temperature);
    setTopK(p.topK);
    setTopP(p.topP);
    setRepetitionPenalty(p.repetitionPenalty);
    setFrequencyPenalty(p.frequencyPenalty);
    setPresencePenalty(p.presencePenalty);
    setSelectedProfileIndex(index);
  };

  // Optionally, on first render, load Profile 0 (Custom 1):
  useEffect(() => {
    switchToProfile(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    // Function to check if the user is near the bottom.  More robust than exact bottom.
    const isNearBottom = () => {
      if (!chatContainerRef.current) return true; // Default to true if no ref
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      return scrollHeight - scrollTop <= clientHeight + 100; // 100px threshold
    };

    const checkAutoScroll = () => {
      if (!chatContainerRef.current) return;

      if (userInterruptedScroll.current) {
          // If the user has scrolled, and they *aren't* near the bottom, keep autoScroll disabled.
          if (!isNearBottom()) {
            return;
          }
        // If we are close to the bottom, reenable auto-scroll.
          setAutoScroll(true);
          userInterruptedScroll.current = false; // Important: Reset the flag.
      }


        if (autoScroll) {
          chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
        }

    }
      // Only call if refs exist.
      if (pendingBotMessageRef.current && chatContainerRef.current){
        checkAutoScroll();
      }
  }, [conversations, autoScroll]); // Depend on conversations and autoScroll

  const toggleSettings = () => {
    setShowSettings((prev) => !prev);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setConversations((prev) => [
      ...prev,
      { role: "user", content: prompt },
      { role: "bot", content: "" },
    ]);
    pendingBotMessageRef.current = "";
    userInterruptedScroll.current = false; // Reset on new submission
    setAutoScroll(true); // Re-enable autoScroll on new submission

    const payload = {
      prompt,
      max_tokens: maxTokens,
      temperature,
      top_k: topK,
      top_p: topP,
      repetition_penalty: repetitionPenalty,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    };

    //const ws = new WebSocket("ws://localhost:7000/ws");//("wss://zelime.duckdns.org/ws");
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let wsPort = '';
    
    // Use port 7000 only when running on localhost (development)
    if (window.location.hostname === 'localhost') {
      wsPort = ':7000';
    }
    
    const ws = new WebSocket(`${wsProtocol}://${window.location.hostname}${wsPort}/ws`);
    

    
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      const token = event.data;
      pendingBotMessageRef.current = mergeToken(pendingBotMessageRef.current, token);

      if (!updateScheduledRef.current) {
        updateScheduledRef.current = true;
        setTimeout(() => {
          setConversations((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex].role === "bot") {
              updated[lastIndex].content = pendingBotMessageRef.current;
            }
            return updated;
          });
          updateScheduledRef.current = false;
        }, 20);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error: ", error);
      setIsConnected(false);
    };

    setPrompt("");
  };


  const handleScroll = () => {
    if (!chatContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 5;  // Small buffer

    if (!isAtBottom) {
      setAutoScroll(false);
      userInterruptedScroll.current = true; // Set the flag when user scrolls up
    }
  };


  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
      setAutoScroll(true);
      userInterruptedScroll.current = false;
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* Navbar with custom profile buttons */}
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        toggleSettings={toggleSettings}
        profiles={profiles}
        selectedProfileIndex={selectedProfileIndex}
        onSelectProfile={switchToProfile}
      />

      {/* SettingsPanel in a modal-like overlay */}
      {showSettings && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 flex items-start justify-center">
          <SettingsPanel
            maxTokens={maxTokens}
            setMaxTokens={setMaxTokens}
            temperature={temperature}
            setTemperature={setTemperature}
            topK={topK}
            setTopK={setTopK}
            topP={topP}
            setTopP={setTopP}
            repetitionPenalty={repetitionPenalty}
            setRepetitionPenalty={setRepetitionPenalty}
            frequencyPenalty={frequencyPenalty}
            setFrequencyPenalty={setFrequencyPenalty}
            presencePenalty={presencePenalty}
            setPresencePenalty={setPresencePenalty}
            closePanel={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 overflow-hidden mt-16">
        <ChatWindow
          conversations={conversations}
          containerRef={chatContainerRef}
          theme={theme}
          onScroll={() => {}}
        />
      </div>

      {/* Example Input area at bottom */}
      <div className="sticky bottom-0">
        <InputArea
          prompt={prompt}
          setPrompt={setPrompt}
          handleSubmit={handleSubmit}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
