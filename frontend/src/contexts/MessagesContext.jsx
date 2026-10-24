import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { messageApi } from '../api.js';

const MessagesContext = createContext(null);

export function MessagesProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await messageApi.getConversations();
      setConversations(data);
      const totalUnread = data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const data = await messageApi.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, []);

  const sendMessage = useCallback(async (recipientId, content) => {
    try {
      const { conversation, message } = await messageApi.sendMessage(recipientId, content);
      
      // Update or add conversation
      setConversations(prev => {
        const existing = prev.find(c => c.id === conversation.id);
        if (existing) {
          return prev.map(c => c.id === conversation.id ? { ...conversation, unread_count: 0 } : c);
        }
        return [{ ...conversation, unread_count: 0 }, ...prev];
      });
      
      // If this is the active conversation, add the message
      if (activeConversation?.id === conversation.id) {
        setMessages(prev => [...prev, message]);
      }
      
      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [activeConversation]);

  const openConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    setIsOpen(true);
    await fetchMessages(conversation.id);
    
    // Update unread count for this conversation
    setConversations(prev => prev.map(c => 
      c.id === conversation.id ? { ...c, unread_count: 0 } : c
    ));
    
    // Recalculate total unread
    setTimeout(() => {
      setConversations(prev => {
        const totalUnread = prev.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadCount(totalUnread);
        return prev;
      });
    }, 100);
  }, [fetchMessages]);

  const closeMessages = useCallback(() => {
    setIsOpen(false);
    setActiveConversation(null);
    setMessages([]);
  }, []);

  // Poll for new messages
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return (
    <MessagesContext.Provider value={{
      conversations,
      activeConversation,
      messages,
      isOpen,
      loading,
      unreadCount,
      fetchConversations,
      fetchMessages,
      sendMessage,
      openConversation,
      closeMessages,
      setIsOpen,
    }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider');
  }
  return context;
}