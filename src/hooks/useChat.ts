import { useState, useCallback } from 'react';
import { Message, ChatSession } from '../types/chat';
import { chatService } from '../services/api/chatService';

export const useChat = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createNewChat = useCallback(async () => {
    try {
      setLoading(true);
      const newSession = await chatService.createSession();
      setSessions(prev => [...prev, newSession]);
      setCurrentSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId) return;

    try {
      setLoading(true);
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date()
      };

      setSessions(prev => {
        return prev.map(session => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              messages: [...session.messages, userMessage],
              updatedAt: new Date()
            };
          }
          return session;
        });
      });

      const response = await chatService.sendMessage(currentSessionId, content);

      setSessions(prev => {
        return prev.map(session => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              messages: [...session.messages, response],
              updatedAt: new Date()
            };
          }
          return session;
        });
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  }, [currentSessionId]);

  return {
    sessions,
    currentSessionId,
    loading,
    createNewChat,
    sendMessage,
    setCurrentSessionId
  };
};