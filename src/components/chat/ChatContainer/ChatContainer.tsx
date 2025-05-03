import { useState } from 'react';
import { ChatHistory } from '../ChatHistory/ChatHistory';
import { ChatMessage } from '../ChatMessage/ChatMessage';
import { ChatInput } from '../ChatInput/ChatInput';
import { useChat } from '../../../hooks/useChat';

export const ChatContainer = () => {
  const {
    sessions,
    currentSessionId,
    loading,
    createNewChat,
    sendMessage,
    setCurrentSessionId
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleFileSelect = (filename: string) => {
    setSelectedFiles(prev => [...prev, filename]);
  };

  const handleSend = async () => {
    if (inputValue.trim() || selectedFiles.length > 0) {
      // If there are files, add them to the message
      const messageContent = inputValue.trim();
      const filesText = selectedFiles.length > 0
        ? `\nAttached files: ${selectedFiles.join(', ')}`
        : '';

      await sendMessage(messageContent + filesText);
      setInputValue('');
      setSelectedFiles([]);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat History Sidebar */}
      <div className="w-64 flex-shrink-0">
        <ChatHistory
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={createNewChat}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentSession?.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {loading && (
            <div className="text-gray-500 italic">Assistant is typing...</div>
          )}
          {!currentSession && (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <h2 className="text-xl font-medium mb-2">Welcome to AI Chat</h2>
                <p>Start a new conversation or select an existing one</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onFileSelect={handleFileSelect}
          disabled={loading || !currentSessionId}
        />
      </div>
    </div>
  );
};
