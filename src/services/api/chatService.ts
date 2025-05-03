import { Message, ChatSession } from '../../types/chat';

// This will be replaced with actual API calls in the future
export class ChatService {
  async sendMessage(sessionId: string, content: string): Promise<Message> {
    // TODO: Implement actual API call
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'This is a placeholder response',
      timestamp: new Date()
    };
  }

  async createSession(): Promise<ChatSession> {
    // TODO: Implement actual API call
    return {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getSessions(): Promise<ChatSession[]> {
    // TODO: Implement actual API call
    return [];
  }
}

export const chatService = new ChatService();