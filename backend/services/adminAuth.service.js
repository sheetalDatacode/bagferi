import Admin from '../models/Admin.model.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.util.js';
import { generateToken } from '../utils/jwt.util.js';
import { isValidEmail, validatePassword } from '../utils/validators.util.js';

/**
 * Login admin with email and password
 * @param {String} email - Admin email
 * @param {String} password - Plain text password
 * @returns {Promise<Object>} { admin, token }
 */
export const loginAdmin = async (email, password) => {
  try {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      throw err;
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find admin by email
    let admin = await Admin.findOne({
      email: normalizedEmail,
    }).select('+password'); // Include password field

    // Auto-create admin on first login (development mode only)
    if (!admin && process.env.NODE_ENV === 'development') {
      // Check if database has any admins
      const adminCount = await Admin.countDocuments();
      
      if (adminCount === 0) {
        // Database is empty, auto-create first admin
        console.log('⚠️  [DEV MODE] No admins found. Auto-creating first admin:', normalizedEmail);
        
        // Extract name from email (before @) or use default
        const nameFromEmail = normalizedEmail.split('@')[0];
        const adminName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1) + ' Admin';
        
        // Hash password
        const hashedPassword = await hashPassword(password.trim());
        
        // Create new admin
        admin = await Admin.create({
          name: adminName,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'admin',
          isActive: true,
        });
        
        console.log('✅ [DEV MODE] Admin auto-created successfully:', normalizedEmail);
        
        // Reload admin with password field
        admin = await Admin.findById(admin._id).select('+password');
      } else {
        // Admin doesn't exist but database has other admins
        if (process.env.NODE_ENV === 'development') {
          console.log('Admin login attempt - Admin not found:', normalizedEmail);
          const allAdmins = await Admin.find({}).select('email');
          console.log('Available admins:', allAdmins.map(a => a.email));
        }
        const err = new Error('Invalid email or password');
        err.status = 401;
        throw err;
      }
    } else if (!admin) {
      // Production mode or admin exists but not found
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    // Check if account is active
    if (!admin.isActive) {
      const err = new Error('Account is inactive. Please contact support.');
      err.status = 403;
      throw err;
    }

    // Verify password (trim password for comparison but preserve original for logging)
    const trimmedPassword = password.trim();
    const isPasswordValid = await comparePassword(trimmedPassword, admin.password);
    if (!isPasswordValid) {
      // Log for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Admin login attempt - Password mismatch for:', normalizedEmail);
        console.log('Password provided length:', trimmedPassword.length);
      }
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    // Generate token
    const token = generateToken({
      adminId: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    // Return admin without password
    const adminObj = admin.toObject();
    delete adminObj.password;

    return {
      admin: adminObj,
      token,
    };
  } catch (error) {
    // Preserve status code if already set
    if (!error.status) {
      error.status = 500;
    }
    throw error;
  }
};

/**
 * Get admin by ID
 * @param {String} adminId - Admin ID
 * @returns {Promise<Object>} Admin object
 */
export const getAdminById = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }
    return admin;
  } catch (error) {
    throw error;
  }
};

