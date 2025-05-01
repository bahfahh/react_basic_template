import { FC } from 'react';
import { ChatSession } from '../../../types/chat';

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export const ChatHistory: FC<ChatHistoryProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-300 w-64">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`
              w-full px-4 py-3 text-left transition-colors
              hover:bg-gray-800
              ${currentSessionId === session.id ? 'bg-gray-800' : ''}
              flex flex-col gap-1
            `}
          >
            <span className="text-sm font-medium truncate">
              {session.title}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(session.updatedAt).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const PlusIcon: FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 4v16m8-8H4" 
    />
  </svg>
);