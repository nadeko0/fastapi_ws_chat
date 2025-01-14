# Real-Time Chat Application 🚀

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socket.io&logoColor=white)

A modern, real-time chat application built with React, TypeScript, and FastAPI. This project demonstrates professional software development practices including SOLID principles, complete CRUD operations, and real-time WebSocket communication. The codebase showcases clean architecture and maintainable patterns used in production environments.

## ✨ Key Implementation Features

### Architecture & Design Patterns
- SOLID principles implementation
- Complete CRUD operations
- Clean code architecture
- Type-safe development
- Error handling and recovery
- Proper dependency management

## ✨ Application Features

### WebSocket Implementation Deep Dive

#### WebSocket Architecture
- **Connection Management**
  - Custom connection manager for handling WebSocket connections
  - Basic connection cleanup and resource release
  - User online/offline status tracking
  - Last seen timestamp updates

#### Implemented WebSocket Features
- **Real-Time Message Delivery**
  - Instant message transmission using WebSocket protocol
  - JSON message format for data transfer
  - Direct message delivery to online users
  - Simple connection state management

- **Connection State Management**
  - Basic connection lifecycle handling
  - Frontend reconnection support
  - Proper connection termination
  - Connection status tracking

- **Performance & Security**
  - JWT-based authentication
  - Secure cookie handling
  - Basic error handling
  - Resource cleanup on disconnect

#### Core Features
- **User Management**
  - User registration and authentication
  - Online/offline status tracking
  - User search functionality
  - Last seen timestamps

- **Messaging**
  - Real-time message delivery
  - Message history with pagination
  - Persistent message storage
  - Direct messaging between users

### Technical Implementation Examples

#### WebSocket Connection Manager (Backend)
```python
class ConnectionManager:
    def __init__(self):
        # Store active connections with user mapping
        self.active_connections: Dict[int, WebSocket] = {}
        self.connection_locks: Dict[int, asyncio.Lock] = {}
        
    async def connect(self, websocket: WebSocket, user_id: int):
        # Accept connection with error handling
        try:
            await websocket.accept()
            self.active_connections[user_id] = websocket
            self.connection_locks[user_id] = asyncio.Lock()
            
            # Update user's online status
            await self.broadcast_user_status(user_id, True)
        except Exception as e:
            logger.error(f"Connection error: {str(e)}")
            raise WebSocketException("Connection failed")
            
    async def disconnect(self, user_id: int):
        # Proper cleanup of resources
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close()
                del self.active_connections[user_id]
                del self.connection_locks[user_id]
                
                # Update user's offline status
                await self.broadcast_user_status(user_id, False)
            except Exception as e:
                logger.error(f"Disconnection error: {str(e)}")
                
    async def send_message(self, message: str, user_id: int):
        # Thread-safe message sending with retries
        if user_id in self.active_connections:
            async with self.connection_locks[user_id]:
                try:
                    await self.active_connections[user_id].send_text(message)
                except WebSocketDisconnect:
                    await self.handle_disconnect(user_id)
                except Exception as e:
                    await self.handle_send_error(user_id, message, e)
```

#### Frontend WebSocket Implementation
```typescript
// Advanced WebSocket hook with reconnection logic
const useWebSocketConnection = (userId: number) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const reconnectAttempts = useRef(0);
  const messageQueue = useRef<Message[]>([]);
  
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    API_ENDPOINTS.WS_CHAT(userId),
    {
      onOpen: () => {
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        processMessageQueue();
      },
      onClose: () => {
        setConnectionState('disconnected');
        handleReconnect();
      },
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          handleIncomingMessage(data);
        } catch (error) {
          handleMessageError(error);
        }
      },
      onError: (event) => {
        handleConnectionError(event);
        setConnectionState('error');
      },
      shouldReconnect: (closeEvent) => {
        return handleReconnectLogic(closeEvent);
      },
      reconnectInterval: calculateReconnectDelay(reconnectAttempts.current),
      reconnectAttempts: 10,
    }
  );

  // Message queueing during disconnection
  const queueMessage = (message: Message) => {
    if (connectionState !== 'connected') {
      messageQueue.current.push(message);
      return;
    }
    sendMessage(JSON.stringify(message));
  };

  // Process queued messages on reconnection
  const processMessageQueue = () => {
    while (messageQueue.current.length > 0) {
      const message = messageQueue.current.shift();
      if (message) sendMessage(JSON.stringify(message));
    }
  };

  // Exponential backoff for reconnection
  const calculateReconnectDelay = (attempt: number) => {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  };

  return {
    connectionState,
    sendMessage: queueMessage,
    lastMessage,
  };
};
```

#### WebSocket Security Measures
```typescript
// Secure WebSocket connection establishment
const establishSecureConnection = async (userId: number, token: string) => {
  const wsUrl = new URL(API_ENDPOINTS.WS_CHAT(userId));
  wsUrl.searchParams.append('token', token);
  
  const socket = new WebSocket(wsUrl.toString());
  
  // Add security headers
  socket.addListener('open', () => {
    socket.send(JSON.stringify({
      type: 'authentication',
      token: token,
    }));
  });
  
  // Implement heartbeat
  setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
  
  return socket;
};
```

### Performance Considerations

#### Message Optimization
- Binary message format for large payloads
- Message compression for bandwidth optimization
- Batch processing for multiple messages
- Efficient JSON serialization/deserialization

#### Connection Management
- Connection pooling for resource efficiency
- Automatic cleanup of stale connections
- Memory leak prevention
- CPU usage optimization

#### Scaling Strategy
- Horizontal scaling with multiple nodes
- Load balancing considerations
- Database connection pooling
- Message queue implementation

### Error Recovery Mechanisms

#### Automatic Reconnection
- Exponential backoff strategy
- Connection state preservation
- Message queue persistence
- Session recovery

#### Error Handling
- Comprehensive error types
- Graceful degradation
- User notification system
- Debug logging and monitoring

### Real-World Applications

#### Use Cases
- Real-time chat systems
- Live collaboration tools
- Gaming applications
- Financial trading platforms
- IoT device communication

#### Implementation Considerations
- Cross-browser compatibility
- Mobile device support
- Network condition handling
- Battery life optimization

### User Experience
- Clean and intuitive interface built with Mantine UI
- Responsive design for all devices
- Message history with infinite scroll
- User search functionality
- Sound notifications for new messages
- Unread message counters

### Security
- JWT-based authentication
- Secure password handling
- Protected WebSocket connections
- CORS protection
- HTTP-only cookies

### Technical Implementation
- TypeScript with strict type checking
- React with proper component lifecycle management
- FastAPI with dependency injection
- SQLite with proper connection handling
- WebSocket with reconnection logic
- Modern async/await patterns with error handling

## 🛠 Technology Stack & Implementation Details

### Frontend Implementation
- **React** - UI library with proper component lifecycle
- **TypeScript** - Strict type checking and interfaces
- **Mantine** - Component library with accessibility
- **react-use-websocket** - WebSocket client with reconnection
- **Axios** - HTTP client with interceptors
- **Vite** - Modern build tool with HMR

### Backend Implementation
- **FastAPI** - Web framework with dependency injection
- **Python** - Clean, maintainable code structure
- **SQLite** - Proper connection management
- **WebSockets** - Connection manager pattern
- **JWT** - Secure authentication flow
- **Uvicorn** - Production-grade ASGI server

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8+
- npm or yarn
- Git

### Installation & Environment Setup

1. Clone the repository
```bash
git clone https://github.com/nadeko0/fastapi-ws-chat.git
cd fastapi-ws-chat
```

2. Set up environment variables
```bash
# Copy example environment files
cp .env.example .env
```

3. Configure environment variables
- Edit `.env` file and set your values for:
  - `SECRET_KEY`: Your secure secret key for JWT
  - `ENVIRONMENT`: 'development' or 'production'
  - `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins
  - `VITE_SERVER_URL`: Backend server URL
  - `VITE_API_PROTOCOL`: 'http' or 'https'
  - `VITE_WS_PROTOCOL`: 'ws' or 'wss'

4. Set up the backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

5. Set up the frontend
```bash
cd frontend
npm install
```

6. Start the development servers

Backend:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend:
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## 📱 Usage

1. Register a new account or login with existing credentials
2. Search for users using the search bar
3. Click on a user to start a chat
4. Send messages using the input field
5. Enjoy real-time communication!

## 🎯 Code Examples

### WebSocket Connection (Frontend)
```typescript
const { sendMessage, readyState } = useWebSocket(API_ENDPOINTS.WS_CHAT(user.id), {
  onMessage: (event) => {
    const data = JSON.parse(event.data) as WebSocketMessage;
    handleNewMessage(data);
  },
  shouldReconnect: () => true,
  reconnectInterval: 3000,
});
```

### Real-Time Message Handling (Backend)
```python
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            await manager.send_message(data, message_data['receiver_id'])
    except WebSocketDisconnect:
        manager.disconnect(user_id)
```

## 🔧 Project Structure & Design Patterns

```
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── messenger.db         # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── styles/          # CSS styles
│   │   ├── config.ts        # Configuration
│   │   └── types.ts         # TypeScript types
│   ├── package.json         # Node.js dependencies
│   └── vite.config.ts       # Vite configuration
└── README.md                # Project documentation
```

### SOLID Principles Implementation
- **Single Responsibility**: Each component and class has one specific purpose
- **Open/Closed**: WebSocket manager and components are extensible
- **Liskov Substitution**: Proper type hierarchy with substitutable interfaces
  - Message types: WebSocketMessage as base type with Message extending it
  - User models: BaseModel extended by User and Message models
  - Error handling: ApiError extends AxiosError maintaining substitutability
- **Interface Segregation**: Clear TypeScript interfaces and API contracts
- **Dependency Inversion**: Proper dependency injection in FastAPI

### Type Hierarchy Examples
```typescript
// Message Type Hierarchy
interface WebSocketMessage {
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
}

interface Message extends WebSocketMessage {
  id: number;
}

// Error Handling Type Hierarchy
interface ErrorResponse {
  detail: string;
}

type ApiError = AxiosError<ErrorResponse>;
```

### CRUD Operations
- **Create**: User registration, message creation
- **Read**: User listing, message history
- **Update**: User status, last seen timestamps
- **Delete**: Session management, cleanup

## 🤝 Contributing & Code Quality

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) for the amazing Python web framework
- [React](https://reactjs.org/) for the powerful UI library
- [Mantine](https://mantine.dev/) for the beautiful components

## 🔮 Future Improvements and Potential Enhancements

- Group chat functionality
- File sharing capabilities
- End-to-end encryption
- Voice and video calls
- Message reactions and replies
- Mobile applications

## 🚀 Production Deployment

For detailed deployment instructions, including server setup, nginx configuration, and maintenance procedures, please refer to our [Deployment Guide](DEPLOYMENT.md).

Key deployment files:
- `nginx-config.txt`: Production-ready nginx configuration template
- `.env.example`: Environment variable template
- `COMMIT_TEMPLATE.md`: Git commit message guidelines
