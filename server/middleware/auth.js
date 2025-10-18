import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const JWT_EXPIRES_IN = '24h';

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Authentication middleware
 */
export function authenticateToken(req, res, next) {
  // Get token from header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }

  // Attach user info to request
  req.user = decoded;
  next();
}

/**
 * Initialize default admin user if none exists
 */
export async function initializeDefaultUser() {
  try {
    // Check if any users exist
    const username = process.env.ADMIN_USERNAME || 'admin';
    let user = UserModel.findByUsername(username);

    if (!user) {
      // Create default admin user
      const password = process.env.ADMIN_PASSWORD || '7Qd7ELzDAx7bcTn';
      const passwordHash = await hashPassword(password);

      user = UserModel.create(username, passwordHash, 'admin');

      console.log('✅ Default admin user created');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      console.log('   ⚠️  Please change the default password!');
    }

    return user;
  } catch (error) {
    console.error('Error initializing default user:', error);
    throw error;
  }
}

/**
 * Login handler
 */
export async function login(username, password) {
  try {
    // Find user
    const user = UserModel.findByUsername(username);
    if (!user) {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }

    // Check password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }

    // Update last login
    UserModel.updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Login failed'
    };
  }
}

export default {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  initializeDefaultUser,
  login
};
