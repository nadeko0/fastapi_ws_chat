import { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Title,
  Container,
  Button,
  Text,
  Stack,
  Card,
} from '@mantine/core';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';
import { User, ApiError } from '../types';
import '../styles/mantine.css';

interface AuthProps {
  setUser: (user: User | null) => void;
}

function Auth({ setUser }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Field change handlers
  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  // Form submission handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? API_ENDPOINTS.LOGIN : API_ENDPOINTS.REGISTER;
      const response = await axios.post<User>(
        endpoint,
        { username, password },
        { withCredentials: true }
      );

      setUser(response.data);
      navigate('/chat');
    } catch (error) {
      const apiError = error as ApiError;
      setError(
        apiError.response?.data?.detail ||
        'An error occurred. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="auth-container">
      <Container size={420}>
        <Card shadow="sm" p="xl" radius="md" withBorder>
          <Title
            ta="center"
            fw={900}
            size="h2"
            style={{
              fontFamily: 'Greycliff CF, sans-serif',
              marginBottom: '1.5rem',
            }}
          >
            {isLogin ? 'Account Login' : 'Registration'}
          </Title>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Username"
                placeholder="Your username"
                value={username}
                onChange={handleUsernameChange}
                size="md"
                required
                autoFocus
                error={!username.trim() && error ? 'Please enter username' : null}
              />

              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={handlePasswordChange}
                size="md"
                required
                error={!password.trim() && error ? 'Please enter password' : null}
              />

              {error && (
                <Text c="red" size="sm" ta="center">
                  {error}
                </Text>
              )}

              <Button 
                type="submit" 
                fullWidth 
                size="md"
                loading={loading}
              >
                {isLogin ? 'Login' : 'Register'}
              </Button>

              <Button
                variant="subtle"
                fullWidth
                onClick={toggleAuthMode}
                size="md"
                disabled={loading}
              >
                {isLogin
                  ? 'No account? Register'
                  : 'Already have an account? Login'}
              </Button>
            </Stack>
          </form>
        </Card>
      </Container>
    </div>
  );
}

export default Auth;