import { AxiosError } from 'axios';

export interface User {
  id: number;
  username: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
}

// Define type for API error response
interface ErrorResponse {
  detail: string;
}

// Extend AxiosError with our response type
export type ApiError = AxiosError<ErrorResponse>;