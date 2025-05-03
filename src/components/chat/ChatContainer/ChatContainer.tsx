import { useState } from 'react';
// Removed: import { ChatHistory } from '../ChatHistory/ChatHistory'; // Keep removed
import { ChatMessage } from '../ChatMessage/ChatMessage';
import { ChatInput } from '../ChatInput/ChatInput';
import { useChat } from '../../../hooks/useChat';

export const ChatContainer = () => {
  const {
    sessions,
    currentSessionId,
    loading,
    // Removed: createNewChat, // Keep removed
    sendMessage,
    // Removed: setCurrentSessionId // Keep removed
  } = useChat();

  // Input value state is managed within ChatInput
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleFileSelect = (filename: string) => {
    setSelectedFiles(prev => [...prev, filename]);
  };

  // Modified handleSend to accept text/action from AIInputWithSuggestions
  const handleSend = async (text: string, action?: string) => {
    if (!currentSessionId) {
        console.error("Cannot send message: No active session selected.");
        // Optionally, provide user feedback here (e.g., toast notification)
        return; // Prevent sending if no session is active
    }
    if (text.trim() || selectedFiles.length > 0) {
      const messageContent = text.trim();
      const filesText = selectedFiles.length > 0
        ? `\nAttached files: ${selectedFiles.join(', ')}`
        : '';

      console.log("Selected action:", action); // Log the action

      await sendMessage(messageContent + filesText);
      setSelectedFiles([]);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    // This container represents the main chat area within the MainLayout
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentSession?.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {loading && (
          <div className="text-gray-500 dark:text-gray-400 italic p-2">Assistant is typing...</div>
        )}
        {/* Welcome message shown if no session is selected AND not loading */}
        {!currentSession && !loading && (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">Welcome to AI Chat</h2>
              <p>Select a conversation or start a new one via the sidebar.</p>
            </div>
          </div>
        )}
         {/* Add a message if session exists but has no messages */}
         {currentSession && currentSession.messages.length === 0 && !loading && (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Send a message to start the conversation.</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        onFileSelect={handleFileSelect}
        // Disable input if loading OR if there's no current session selected
        disabled={loading || !currentSessionId}
      />
    </div>
  );
};
