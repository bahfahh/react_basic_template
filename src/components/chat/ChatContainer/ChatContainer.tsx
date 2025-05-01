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

  const handleSend = async () => {
    if (inputValue.trim()) {
      await sendMessage(inputValue.trim());
      setInputValue('');
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
        </div>

        {/* Input Area */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          disabled={loading}
        />
      </div>
    </div>
  );
};