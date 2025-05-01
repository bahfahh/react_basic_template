import { FC } from 'react';
import { Message } from '../../../types/chat';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-4`}>
      <div className="max-w-[80%]">
        <div
          className={`
            p-4 rounded-lg text-sm
            ${isUser
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-800'
            }
          `}
        >
          {message.content}
        </div>
        <div className="text-xs text-gray-500 mt-1 px-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};