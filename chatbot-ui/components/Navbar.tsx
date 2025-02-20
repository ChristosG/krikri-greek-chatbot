import { FaBars, FaMoon, FaSun } from "react-icons/fa";

// Define a type for your Profile
type Profile = {
  name: string;
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  repetitionPenalty: number;
  frequencyPenalty: number;
  presencePenalty: number;
};

type NavbarProps = {
  theme: "dark" | "light";
  toggleTheme: () => void;
  toggleSettings: () => void;

  // New props for custom profiles
  profiles: Profile[];
  selectedProfileIndex: number;
  onSelectProfile: (index: number) => void;
};

export default function Navbar({
  theme,
  toggleTheme,
  toggleSettings,
  profiles,
  selectedProfileIndex,
  onSelectProfile,
}: NavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 shadow-md bg-gray-800 bg-opacity-90 backdrop-blur-sm">
      <div className="flex items-center space-x-4">
        {/* Settings Button */}
        <button
          onClick={toggleSettings}
          className="text-2xl text-white hover:text-gray-300 transition-colors duration-200"
        >
          <FaBars />
        </button>
        <h1 className="text-2xl font-bold text-white">Greek gtp</h1>
      </div>

      <div className="flex items-center space-x-2">
        {/* Profile Buttons */}
        {profiles.map((profile, idx) => {
          const isActive = idx === selectedProfileIndex;
          return (
            <button
              key={idx}
              onClick={() => onSelectProfile(idx)}
              className={`
                px-3 py-2 text-sm rounded transition-colors duration-200 
                ${isActive ? "bg-green-500 text-white" : "bg-gray-600 text-gray-100"}
                hover:bg-green-400
              `}
            >
              {profile.name}
            </button>
          );
        })}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded transition-colors duration-200"
        >
          {theme === "dark" ? (
            <>
              <FaSun className="mr-1" />
              Light Mode
            </>
          ) : (
            <>
              <FaMoon className="mr-1" />
              Dark Mode
            </>
          )}
        </button>
      </div>
    </header>
  );
}
