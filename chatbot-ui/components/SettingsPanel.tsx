import React from "react";

type SettingsPanelProps = {
  maxTokens: number;
  setMaxTokens: (value: number) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  topK: number;
  setTopK: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  repetitionPenalty: number;
  setRepetitionPenalty: (value: number) => void;
  frequencyPenalty: number;
  setFrequencyPenalty: (value: number) => void;
  presencePenalty: number;
  setPresencePenalty: (value: number) => void;
  closePanel: () => void;
};

export default function SettingsPanel({
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
  topK,
  setTopK,
  topP,
  setTopP,
  repetitionPenalty,
  setRepetitionPenalty,
  frequencyPenalty,
  setFrequencyPenalty,
  presencePenalty,
  setPresencePenalty,
  closePanel,
}: SettingsPanelProps) {
  return (
    // Modal overlay for settings
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop (click to close) */}
      <div className="absolute inset-0 bg-black opacity-50" onClick={closePanel}></div>
      {/* Settings Panel */}
      <div className="relative bg-gray-800 text-white p-6 rounded-lg shadow-lg w-full max-w-3xl z-10">
        <h2 className="text-xl mb-4">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max Tokens */}
          <div>
            <label className="block mb-1">Max Tokens</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
          </div>
          {/* Temperature */}
          <div>
            <label className="block mb-1">Temperature</label>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
          </div>
          {/* Top K */}
          <div>
            <label className="block mb-1">Top K</label>
            <input
              type="number"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
          </div>
          {/* Top P */}
          <div>
            <label className="block mb-1">Top P</label>
            <input
              type="number"
              step="0.1"
              value={topP}
              onChange={(e) => setTopP(Number(e.target.value))}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
          </div>
          {/* Repetition Penalty */}
          <div>
            <label className="block mb-1">Repetition Penalty</label>
            <input
              type="number"
              step="0.1"
              value={repetitionPenalty}
              onChange={(e) => setRepetitionPenalty(Number(e.target.value))}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
          </div>
          {/* Frequency Penalty */}
          <div>
            <label className="block mb-1">Frequency Penalty</label>
            <input
              type="number"
              step="0.1"
              value={frequencyPenalty}
              onChange={(e) => setFrequencyPenalty(Number(e.target.value))}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
          </div>
          {/* Presence Penalty */}
          <div>
            <label className="block mb-1">Presence Penalty</label>
            <input
              type="number"
              step="0.1"
              value={presencePenalty}
              onChange={(e) => setPresencePenalty(Number(e.target.value))}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
          </div>
        </div>
        <div className="mt-4 text-right">
          <button onClick={closePanel} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
