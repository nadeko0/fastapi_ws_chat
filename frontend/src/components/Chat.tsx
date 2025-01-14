// State management is currently using useState
// Consider migrating to RTK Query for better scalability

import { useState, useEffect, useRef, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket'; // Great library by @robrua
import {
  Container,
  Paper,
  TextInput,
  Button,
  Stack,
  Group,
  Text,
  ScrollArea,
  Box,
  Badge,
  Card,
  Loader,
} from '@mantine/core';
import axios, { AxiosInstance } from 'axios';
import { API_ENDPOINTS } from '../config';

// Should be moved to api/axios.ts
// Keeping it here for now for simplicity
const api: AxiosInstance = axios.create({
  withCredentials: true // Required for cookie handling
});

// Additional fields to consider:
// - avatar
// - status message
// - typing indicator
// - last seen timestamp
interface User {
  id: number;
  username: string;
  online?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  totalMessages?: number;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
}

interface WebSocketMessage {
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
}

interface ChatProps {
  user: User;
}

function Chat({ user }: ChatProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadMessages, setUnreadMessages] = useState<{ [key: number]: number }>({});
  const viewport = useRef<HTMLDivElement>(null);
  const [originalTitle] = useState(document.title);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // WebSocket connection handling
  // Stable implementation after several iterations
  const { sendMessage, readyState } = useWebSocket(API_ENDPOINTS.WS_CHAT(user.id), {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        const messageWithId: Message = {
          ...data,
          id: Date.now(),
        };
        handleNewMessage(messageWithId);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    },
    shouldReconnect: () => true,
    reconnectInterval: 3000,
    reconnectAttempts: 10,
    onError: (event) => {
      console.error('WebSocket connection error:', event);
    }
  });

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting to chat...',
    [ReadyState.OPEN]: 'Connected',
    [ReadyState.CLOSING]: 'Disconnecting...',
    [ReadyState.CLOSED]: 'Disconnected',
    [ReadyState.UNINSTANTIATED]: 'Not connected',
  }[readyState];

  // Could optimize server requests
  // Currently polling more frequently than needed
  const loadUsersAndChats = useCallback(async (query?: string) => {
    try {
      setSearching(true);
      // Load users with search query consideration
      const response = await api.get(API_ENDPOINTS.USERS, {
        params: query ? { search: query } : undefined
      });
      const allUsers = response.data;

      // Preserve current chat data
      const currentUsers = new Map(users.map(u => [u.id, u]));

      // Load messages for new users
      const usersWithLastMessage = await Promise.all(
        allUsers.map(async (u: User) => {
          // If we already have data for this user and no search query,
          // use existing data
          if (currentUsers.has(u.id) && !query) {
            return {
              ...u,
              ...currentUsers.get(u.id)
            };
          }

          try {
            const msgResponse = await api.get(API_ENDPOINTS.MESSAGES(u.id));
            const messages = msgResponse.data.messages;
            if (messages && messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              return {
                ...u,
                lastMessage: lastMessage.content,
                lastMessageTime: lastMessage.timestamp,
                totalMessages: msgResponse.data.total_count
              };
            }
            return u;
          } catch (error) {
            console.error(`Error loading messages for user ${u.id}:`, error);
            return u;
          }
        })
      );

      // Sort users by last message time
      const sortedUsers = usersWithLastMessage.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

      setUsers(sortedUsers);

      // Update selected user data
      if (selectedUser) {
        const updatedSelectedUser = sortedUsers.find(u => u.id === selectedUser.id);
        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setSearching(false);
    }
  }, [users, selectedUser]);

  // Basic debounce implementation
  // Consider using a dedicated library later
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsersAndChats(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, loadUsersAndChats]);

  // Status update polling
  // Works reliably despite being a simple solution
  useEffect(() => {
    if (!searchQuery) {
      loadUsersAndChats();
      const interval = setInterval(() => loadUsersAndChats(), 5000); // Frequent updates for better reactivity
      return () => clearInterval(interval);
    }
  }, [searchQuery, loadUsersAndChats]);

  // Update chat list on component mount
  useEffect(() => {
    loadUsersAndChats();
  }, [loadUsersAndChats]);

  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);

  // Message history is limited to 100
  // Should implement infinite scroll with cursor
  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedUser) return;
      setLoading(true);

      try {
        const response = await api.get(API_ENDPOINTS.MESSAGES(selectedUser.id));
        setMessages(response.data.messages);
        setTotalMessages(response.data.total_count);
        setHasMoreMessages(response.data.has_more);
        setUnreadMessages((prev) => ({ ...prev, [selectedUser.id]: 0 }));
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [selectedUser]);

  // Auto-scroll behavior needs improvement
  // Currently works but not perfectly reliable
  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Notification sound from an open source project
  // Credit to original author for the pleasant tone
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
  }, []);

  // Handle new message reception
  const handleNewMessage = (message: Message) => {
    // Update chat list to display new message
    loadUsersAndChats();

    if (selectedUser?.id === message.sender_id) {
      // If chat is open with the sender
      setMessages((prev) => [...(prev || []), message]);
      setTotalMessages((prev) => prev + 1);
    } else {
      // If chat is not open with the sender
      setUnreadMessages((prev) => ({
        ...prev,
        [message.sender_id]: (prev[message.sender_id] || 0) + 1,
      }));
      document.title = '(New message) ' + originalTitle;
      audioRef.current?.play().catch(() => {
        // Ignore autoplay error
      });
    }
  };

  // Message sending implementation
  // Requires active WebSocket connection
  const handleSendMessage = () => {
    if (!selectedUser || !newMessage.trim()) return;

    const messageData = {
      receiver_id: selectedUser.id,
      content: newMessage,
    };

    sendMessage(JSON.stringify(messageData));
    const newMsg = {
      id: Date.now(),
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: newMessage,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...(prev || []), newMsg]);
    setTotalMessages((prev) => prev + 1);
    setNewMessage('');

    // Update chat list after sending message
    loadUsersAndChats();
  };

  // Restore title on window focus
  useEffect(() => {
    const handleFocus = () => {
      document.title = originalTitle;
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [originalTitle]);

  // Component needs refactoring
  // Should be split into smaller components
  return (
    <Container size="lg" mt="md">
      <Group align="flex-start" style={{ height: 'calc(100vh - 120px)' }}>
        {/* User List */}
        <Card shadow="sm" p="md" style={{ width: 250 }}>
          <Stack>
            <Text size="sm" c="dimmed" ta="center">
              Status: {connectionStatus}
            </Text>
            
            <TextInput
              placeholder="Search users by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              rightSection={searching && <Loader size="xs" />}
            />

            {users.map((u) => (
              <Box key={u.id} style={{ marginBottom: '8px' }}>
                <Group justify="space-between" style={{ width: '100%' }}>
                  <Button
                    variant={selectedUser?.id === u.id ? 'filled' : 'light'}
                    onClick={() => setSelectedUser(u)}
                    style={{ flex: 1, minHeight: '48px', padding: '8px' }}
                  >
                    <Stack gap="xs" style={{ width: '100%', minWidth: 0 }}>
                      <Group wrap="nowrap" justify="space-between" style={{ width: '100%' }}>
                        <Text style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.username}
                        </Text>
                        <Group gap="xs" wrap="nowrap">
                          {u.online && (
                            <Badge color="green" size="sm" variant="dot" style={{ whiteSpace: 'nowrap', minWidth: 'auto' }}>
                              online
                            </Badge>
                          )}
                          {unreadMessages[u.id] > 0 && (
                            <Badge color="red" size="sm" style={{ minWidth: 'auto' }}>
                              {unreadMessages[u.id]}
                            </Badge>
                          )}
                        </Group>
                      </Group>
                      {u.lastMessage && (
                        <Box style={{ width: '100%' }}>
                          <Group justify="space-between" style={{ width: '100%' }}>
                            <Text size="xs" c="dimmed" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.lastMessage}
                            </Text>
                            {u.lastMessageTime && (
                              <Text size="xs" c="dimmed">
                            {u.lastMessageTime ? new Date(u.lastMessageTime).toLocaleTimeString() : ''}
                              </Text>
                            )}
                          </Group>
                          {typeof u.totalMessages === 'number' && u.totalMessages > 0 && (
                            <Text size="xs" c="dimmed" ta="right">
                              Total messages: {u.totalMessages}
                            </Text>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </Button>
                  <Button 
                    variant="subtle"
                    size="xs"
                    onClick={() => navigator.clipboard.writeText(u.id.toString())}
                    style={{ minWidth: 'auto', padding: '0 8px' }}
                  >
                    #{u.id}
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
        </Card>

        {/* Chat Area */}
        <Card shadow="sm" p="md" style={{ flex: 1, height: '100%' }}>
          {selectedUser ? (
            <Stack justify="space-between" style={{ height: '100%' }}>
              <Group justify="space-between">
                <Text fw={500}>
                  Conversation with {selectedUser.username} #{selectedUser.id}
                </Text>
                {selectedUser.online && (
                  <Badge color="green" variant="dot">online</Badge>
                )}
              </Group>
              
              <ScrollArea viewportRef={viewport} h="calc(100vh - 250px)">
                {loading ? (
                  <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Loader />
                  </Box>
                ) : (
                  <Stack>
                    {!messages || messages.length === 0 ? (
                      <Text c="dimmed" ta="center" mt="xl">
                        No messages yet. Start a conversation!
                      </Text>
                    ) : (
                      <>
                        <Text c="dimmed" size="xs" ta="center">
                          {hasMoreMessages 
                            ? `Showing last ${messages.length} of ${totalMessages} messages`
                            : `Total messages: ${totalMessages}`
                          }
                        </Text>
                        {messages.map((message) => (
                      <Box
                        key={message.id}
                        style={{
                          alignSelf:
                            message.sender_id === user.id
                              ? 'flex-end'
                              : 'flex-start',
                          maxWidth: '70%',
                        }}
                      >
                        <Paper
                          p="xs"
                          bg={message.sender_id === user.id ? 'blue.1' : 'gray.1'}
                          style={{
                            borderRadius: '8px',
                          }}
                        >
                          <Text size="sm">{message.content}</Text>
                          <Text size="xs" c="dimmed">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Text>
                        </Paper>
                      </Box>
                    ))}
                      </>
                    )}
                  </Stack>
                )}
              </ScrollArea>

              <Group>
                <TextInput
              placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{ flex: 1 }}
                />
                <Button onClick={handleSendMessage}>Send</Button>
              </Group>
            </Stack>
          ) : (
            <Text c="dimmed" ta="center">
              Select a user to start a conversation
            </Text>
          )}
        </Card>
      </Group>
    </Container>
  );
}

export default Chat;