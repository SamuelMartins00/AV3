import axios from 'axios';
import { env } from './env';

/** Cliente HTTP base. */
export const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});
