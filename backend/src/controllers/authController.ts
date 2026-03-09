import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'jam-session-secret-key';
const SALT_ROUNDS = 10;
const MONGO_URI = process.env.MONGODB_URI || '';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  try {
    if (mongoose.connection.readyState !== 1 && MONGO_URI) {
      res.status(503).json({ error: 'Database is still connecting. Please try again in a moment.' });
      return;
    }

    let user;
    if (MONGO_URI) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      user = new User({ username, passwordHash });
      await user.save();
    } else {
      user = { username }; // In-memory fallback if no MongoDB
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`Registered user: ${user.username}`);
    res.status(201).json({ token, username: user.username });
  } catch (error) {
    console.error('Registration error details:', error);
    res.status(500).json({ error: 'Registration failed - check server logs' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  try {
    if (mongoose.connection.readyState !== 1 && MONGO_URI) {
      res.status(503).json({ error: 'Database is still connecting. Please try again in a moment.' });
      return;
    }

    let isValid = false;
    let dbUser = null;

    if (MONGO_URI) {
      dbUser = await User.findOne({ username });
      if (!dbUser) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }
      isValid = await bcrypt.compare(password, dbUser.passwordHash);
    } else {
      isValid = true; // In-memory fallback blindly trusts for demo purposes if no DB
    }

    if (!isValid) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign({ username: dbUser ? dbUser.username : username }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`User logged in: ${username}`);
    res.status(200).json({ token, username: dbUser ? dbUser.username : username });
  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({ error: 'Login failed - check server logs' });
  }
};
