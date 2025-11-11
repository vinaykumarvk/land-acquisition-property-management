import { storage } from "../storage";
import { InsertUser } from "@shared/schema";
import bcrypt from "bcrypt";

// In-memory OTP storage (in production, use Redis or database)
interface OTPRecord {
  phone: string;
  otp: string;
  expiresAt: Date;
  attempts: number;
}

const otpStore = new Map<string, OTPRecord>();
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

export class AuthService {
  /**
   * Generate a 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to phone number (for citizen authentication)
   * In production, integrate with SMS gateway (Twilio, AWS SNS, etc.)
   */
  async sendOTP(phone: string): Promise<{
    success: boolean;
    message?: string;
    expiresIn?: number;
  }> {
    try {
      // Validate phone number (Indian format: 10 digits)
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return { success: false, message: 'Invalid phone number. Must be 10 digits.' };
      }

      // Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP
      otpStore.set(cleanPhone, {
        phone: cleanPhone,
        otp,
        expiresAt,
        attempts: 0,
      });

      // In production, send SMS here
      // For now, log it (in development, you can see it in console)
      console.log(`[OTP] Phone: ${cleanPhone}, OTP: ${otp} (expires in ${OTP_EXPIRY_MINUTES} minutes)`);

      return {
        success: true,
        message: `OTP sent to ${cleanPhone}. In development, check console for OTP.`,
        expiresIn: OTP_EXPIRY_MINUTES * 60,
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  /**
   * Verify OTP and login/register citizen
   */
  async verifyOTP(phone: string, otp: string, userData?: {
    firstName: string;
    lastName: string;
    email?: string;
    aadhaar?: string;
  }): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const otpRecord = otpStore.get(cleanPhone);

      if (!otpRecord) {
        return { success: false, message: 'OTP not found. Please request a new OTP.' };
      }

      // Check expiry
      if (new Date() > otpRecord.expiresAt) {
        otpStore.delete(cleanPhone);
        return { success: false, message: 'OTP has expired. Please request a new OTP.' };
      }

      // Check attempts
      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        otpStore.delete(cleanPhone);
        return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        otpRecord.attempts++;
        return { success: false, message: 'Invalid OTP. Please try again.' };
      }

      // OTP verified - find or create user
      let user = await storage.getUserByPhone(cleanPhone);

      if (!user) {
        // New citizen registration
        if (!userData) {
          return { success: false, message: 'User data required for registration' };
        }

        // Generate username from phone
        const username = `citizen_${cleanPhone}`;
        
        // Check if username exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return { success: false, message: 'User already exists. Please login instead.' };
        }

        // Create citizen user
        const hashedPassword = await bcrypt.hash(otp, 10); // Use OTP as initial password
        user = await storage.createUser({
          username,
          email: userData.email || `${username}@citizen.local`,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'citizen',
          phone: cleanPhone,
          aadhaar: userData.aadhaar,
        });
      } else {
        // Existing user - verify they're a citizen
        if (user.role !== 'citizen') {
          return { success: false, message: 'This phone number is registered as a staff member. Please use regular login.' };
        }
      }

      // Clear OTP
      otpStore.delete(cleanPhone);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, message: 'OTP verification failed' };
    }
  }

  async login(username: string, password: string): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid credentials' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Account is deactivated' };
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  async register(userData: InsertUser): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return { success: false, message: 'Username already exists' };
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return { success: false, message: 'Email already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }
}

export const authService = new AuthService();
