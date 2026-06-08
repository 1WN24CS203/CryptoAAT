import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import User from '../models/User.js';
import { analyzePassword } from '../utils/passwordAnalyzer.js';
import { generateWordlistJS } from '../utils/customWordlist.js';

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Helper to execute commands
const runCommand = (cmd) => {
  return new Promise((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
};

// Generates a standard FreeBSD-compatible md5crypt ($1$) hash of a password
const getMd5Crypt = (password, salt = 'aat') => {
  return new Promise((resolve) => {
    // Clean salt: up to 8 characters, only before first '$'
    if (salt.startsWith("$1$")) salt = salt.slice(3);
    const pos = salt.indexOf("$");
    if (pos !== -1) salt = salt.slice(0, pos);
    salt = salt.slice(0, 8);

    const key = password;
    
    // Start digest A
    let ctx = crypto.createHash('md5');
    ctx.update(key);
    ctx.update("$1$");
    ctx.update(salt);

    // Start digest B
    let ctx1 = crypto.createHash('md5');
    ctx1.update(key);
    ctx1.update(salt);
    ctx1.update(key);
    let final = ctx1.digest();

    // Add B's output to A
    let pl = key.length;
    while (pl > 0) {
      ctx.update(final.slice(0, Math.min(pl, 16)));
      pl -= 16;
    }

    // For each bit of the password length, add 0 or the first character of the password
    for (let i = key.length; i > 0; i >>= 1) {
      if ((i & 1) !== 0) {
        ctx.update(Buffer.from([0]));
      } else {
        ctx.update(Buffer.from([key.charCodeAt(0)]));
      }
    }

    final = ctx.digest();

    // 1000 rounds of MD5
    for (let i = 0; i < 1000; i++) {
      let ctx2 = crypto.createHash('md5');
      if ((i & 1) !== 0) {
        ctx2.update(key);
      } else {
        ctx2.update(final);
      }

      if (i % 3 !== 0) {
        ctx2.update(salt);
      }

      if (i % 7 !== 0) {
        ctx2.update(key);
      }

      if ((i & 1) !== 0) {
        ctx2.update(final);
      } else {
        ctx2.update(key);
      }
      final = ctx2.digest();
    }

    // Base64 encoding using a custom permutation
    const BASE64_ALPHABET = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const toBase64 = (v, n) => {
      let s = "";
      while (--n >= 0) {
        s += BASE64_ALPHABET.charAt(v & 0x3f);
        v >>= 6;
      }
      return s;
    };

    let result = "$1$" + salt + "$";
    
    const val = (((final[0] << 16) | (final[6] << 8) | final[12]) >>> 0);
    result += toBase64(val, 4);

    const val2 = (((final[1] << 16) | (final[7] << 8) | final[13]) >>> 0);
    result += toBase64(val2, 4);

    const val3 = (((final[2] << 16) | (final[8] << 8) | final[14]) >>> 0);
    result += toBase64(val3, 4);

    const val4 = (((final[3] << 16) | (final[9] << 8) | final[15]) >>> 0);
    result += toBase64(val4, 4);

    const val5 = (((final[4] << 16) | (final[10] << 8) | final[5]) >>> 0);
    result += toBase64(val5, 4);

    const val6 = (final[11] >>> 0);
    result += toBase64(val6, 2);

    resolve(result);
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, dob, collegeName, favoriteWord } = req.body;

    if (!name || !email || !password || !dob || !collegeName || !favoriteWord) {
      return res.status(400).json({ success: false, message: 'All registration fields are required' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Run password analyzer on the plaintext password first
    const analysis = analyzePassword(password, {
      name,
      email,
      dob,
      collegeName,
      favoriteWord,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const md5CryptPassword = await getMd5Crypt(password);

    // Create user with analyzer outputs cached
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      passwordMd5Crypt: md5CryptPassword,
      dob,
      collegeName,
      favoriteWord,
      passwordScore: analysis.score,
      passwordStatus: analysis.status,
      passwordReasons: analysis.reasons,
      passwordRecommendations: analysis.recommendations,
    });

    if (user) {
      res.status(201).json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
        analysis: {
          score: user.passwordScore,
          status: user.passwordStatus,
          reasons: user.passwordReasons,
          recommendations: user.passwordRecommendations,
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
        analysis: {
          score: user.passwordScore,
          status: user.passwordStatus,
          reasons: user.passwordReasons,
          recommendations: user.passwordRecommendations,
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

/**
 * @desc    Forgot Password - Send OTP
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store in DB
    user.resetOtp = otp;
    user.resetOtpExpires = expiryTime;
    await user.save();

    // Print to console in high visibility
    console.log('\n\x1b[36m==================================================\x1b[0m');
    console.log('\x1b[33m                    CRYPTOAAT OTP                 \x1b[0m');
    console.log(`\x1b[37m  OTP Code for: ${email}\x1b[0m`);
    console.log(`\x1b[42m\x1b[30m  OTP CODE: ${otp}  \x1b[0m`);
    console.log('\x1b[37m  Expires in: 15 minutes\x1b[0m');
    console.log('\x1b[36m==================================================\n\x1b[0m');

    // Try sending email if SMTP is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const mailOptions = {
          from: `"CryptoAAT Security" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Password Recovery OTP - CryptoAAT',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="color: #4A90E2; text-align: center;">CryptoAAT Password Recovery</h2>
              <p>Hello ${user.name},</p>
              <p>You requested a password reset. Please use the following 6-digit OTP (One Time Password) to verify your request:</p>
              <div style="background-color: #f7f7f7; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333;">${otp}</span>
              </div>
              <p style="color: #ff3333; font-size: 13px;">Note: This OTP is valid for 15 minutes only. If you did not make this request, please secure your account immediately.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #888; text-align: center;">CryptoAAT Security System</p>
            </div>
          `,
        };

        // Send email in the background to avoid blocking the API response
        transporter.sendMail(mailOptions)
          .then(() => console.log(`Email successfully sent to ${email}`))
          .catch((mailError) => console.error('SMTP background sending error:', mailError.message));
      } catch (mailError) {
        console.error('SMTP transporter setup error:', mailError.message);
      }
    }

    res.json({ success: true, message: 'OTP sent successfully to email (and logged to server terminal)' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error during password recovery request' });
  }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > user.resetOtpExpires) {
      return res.status(400).json({ success: false, message: 'OTP code has expired' });
    }

    res.json({ success: true, message: 'OTP code verified successfully' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP verification' });
  }
};

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > user.resetOtpExpires) {
      return res.status(400).json({ success: false, message: 'OTP code has expired' });
    }

    // Run password analyzer for the new password
    const analysis = analyzePassword(newPassword, {
      name: user.name,
      email: user.email,
      dob: user.dob,
      collegeName: user.collegeName,
      favoriteWord: user.favoriteWord,
    });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordMd5Crypt = await getMd5Crypt(newPassword);

    // Clear OTP fields & update cached strength metrics
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.passwordScore = analysis.score;
    user.passwordStatus = analysis.status;
    user.passwordReasons = analysis.reasons;
    user.passwordRecommendations = analysis.recommendations;

    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, message: 'Server error during password reset' });
  }
};

/**
 * @desc    Get current user profile & analysis
 * @route   GET /api/auth/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    // req.user is populated by protect middleware
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        dob: user.dob,
        collegeName: user.collegeName,
        favoriteWord: user.favoriteWord,
        analysis: {
          score: user.passwordScore,
          status: user.passwordStatus,
          reasons: user.passwordReasons,
          recommendations: user.passwordRecommendations,
        },
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching user profile' });
  }
};

/**
 * @desc    Public interactive test password analyzer endpoint
 * @route   POST /api/auth/analyze-test
 * @access  Public/Private (we can make it public so users can test arbitrary passwords)
 */
export const testAnalyzer = async (req, res) => {
  try {
    const { password, userData } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required to run analyzer' });
    }
    const analysis = analyzePassword(password, userData || {});
    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Test Analyzer Error:', error);
    res.status(500).json({ success: false, message: 'Server error evaluating password' });
  }
};


export const ensureStandardDictionary = () => {
  const dictPath = path.join(process.cwd(), 'rockyou.txt');
  if (!fs.existsSync(dictPath) || fs.statSync(dictPath).size === 0) {
    // Generate a curated list of top 2000 common passwords from rockyou/standard lists
    const commonPasswords = [
      '123456', 'password', '12345678', '123456789', '1234', '12345',
      'qwerty', '1234567', 'welcome', '111111', '123123', 'admin',
      'letmein', 'password123', '1234567890', 'princess', 'iloveyou',
      'sunshine', 'monkey', 'charlie', 'daniel', 'jordan', 'superman',
      'shadow', 'killer', 'soccer', 'football', 'baseball', 'hockey',
      'cheesecake', 'cookie', 'butter', 'coffee', 'chocolate', 'mustang',
      'trustno1', 'welcome1', 'admin123', 'qwertyuiop', 'pass123'
    ];
    
    const names = ['alex', 'ashley', 'andrew', 'brandon', 'brian', 'chris', 'cody', 'david', 'dylan', 'emily', 'eric', 'haley', 'jacob', 'james', 'jessica', 'john', 'justin', 'kyle', 'lauren', 'matthew', 'megan', 'michael', 'nathan', 'nicholas', 'nicole', 'rachel', 'ryan', 'sarah', 'taylor', 'tyler', 'william', 'zachary'];
    
    const extra = [];
    names.forEach(name => {
      extra.push(name);
      extra.push(name.charAt(0).toUpperCase() + name.slice(1));
      extra.push(name + '123');
      extra.push(name + '1');
      extra.push(name + '2020');
      extra.push(name + '2021');
      extra.push(name + '2022');
      extra.push(name + '2023');
      extra.push(name + '2024');
      extra.push(name + '2025');
      extra.push(name + '2026');
    });
    
    for (let i = 0; i < 300; i++) {
      extra.push(i.toString());
      extra.push('password' + i);
      extra.push('welcome' + i);
      extra.push('admin' + i);
      extra.push('pass' + i);
    }
    
    const finalSet = new Set([...commonPasswords, ...extra]);
    fs.writeFileSync(dictPath, Array.from(finalSet).join('\n'));
    console.log(`[+] Initialized fallback standard dictionary with ${finalSet.size} entries.`);
  }
};

const runJSConcurrentCracking = async (targetHash, customWordlist, standardWordlist, formatName) => {
  let isFinished = false;
  let crackedPassword = null;
  let winner = null;
  const terminalLogs = [];

  terminalLogs.push(`[*] Launching JS Native Parallel Solvers...`);

  // Shared statistics
  let customChecked = 0;
  let standardChecked = 0;
  let bruteChecked = 0;

  // Alphabet for brute force
  const bruteCharset = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$';
  
  const verifyCandidate = async (password) => {
    if (formatName === 'md5crypt') {
      const candHash = await getMd5Crypt(password, targetHash);
      return candHash === targetHash;
    } else {
      return await bcrypt.compare(password, targetHash);
    }
  };

  // 1. Custom Dictionary Loop
  const runCustomAttack = () => {
    return new Promise((resolve) => {
      let index = 0;
      const batchSize = formatName === 'md5crypt' ? 20 : 1;

      const checkNext = async () => {
        if (isFinished) {
          resolve();
          return;
        }

        const end = Math.min(index + batchSize, customWordlist.length);
        for (let i = index; i < end; i++) {
          const cand = customWordlist[i];
          customChecked++;
          
          if (customChecked % 100 === 0 || i === customWordlist.length - 1) {
            terminalLogs.push(`[~] [Custom Dictionary] Checked ${customChecked}/${customWordlist.length} candidates...`);
          }

          const match = await verifyCandidate(cand);
          if (match) {
            isFinished = true;
            crackedPassword = cand;
            winner = 'Custom Dictionary';
            resolve();
            return;
          }
        }

        index = end;
        if (index >= customWordlist.length) {
          terminalLogs.push(`[-] [Custom Dictionary] Wordlist exhausted. Checked ${customChecked} candidates.`);
          resolve();
        } else {
          setImmediate(checkNext);
        }
      };
      
      terminalLogs.push(`[+] [Custom Dictionary] Started check (candidates: ${customWordlist.length}).`);
      setImmediate(checkNext);
    });
  };

  // 2. Standard Dictionary Loop
  const runStandardAttack = () => {
    return new Promise((resolve) => {
      let index = 0;
      const batchSize = formatName === 'md5crypt' ? 20 : 1;

      const checkNext = async () => {
        if (isFinished) {
          resolve();
          return;
        }

        const end = Math.min(index + batchSize, standardWordlist.length);
        for (let i = index; i < end; i++) {
          const cand = standardWordlist[i];
          standardChecked++;

          if (standardChecked % 500 === 0 || i === standardWordlist.length - 1) {
            terminalLogs.push(`[~] [Standard Dictionary] Checked ${standardChecked}/${standardWordlist.length} candidates...`);
          }

          const match = await verifyCandidate(cand);
          if (match) {
            isFinished = true;
            crackedPassword = cand;
            winner = 'Standard Dictionary';
            resolve();
            return;
          }
        }

        index = end;
        if (index >= standardWordlist.length) {
          terminalLogs.push(`[-] [Standard Dictionary] Wordlist exhausted. Checked ${standardChecked} candidates.`);
          resolve();
        } else {
          setImmediate(checkNext);
        }
      };

      terminalLogs.push(`[+] [Standard Dictionary] Started check (candidates: ${standardWordlist.length}).`);
      setImmediate(checkNext);
    });
  };

  // 3. Brute Force Loop
  const runBruteForceAttack = () => {
    return new Promise((resolve) => {
      let currentCounter = 0;
      const batchSize = formatName === 'md5crypt' ? 10 : 1;
      
      const getBruteForcePassword = (n) => {
        let result = '';
        let temp = n;
        while (temp >= 0) {
          result = bruteCharset[temp % bruteCharset.length] + result;
          temp = Math.floor(temp / bruteCharset.length) - 1;
        }
        return result;
      };

      const checkNext = async () => {
        if (isFinished) {
          resolve();
          return;
        }

        const maxBruteAttempts = formatName === 'md5crypt' ? 20000 : 100;

        const end = Math.min(currentCounter + batchSize, maxBruteAttempts);
        for (let i = currentCounter; i < end; i++) {
          const cand = getBruteForcePassword(i);
          bruteChecked++;

          if (bruteChecked % 200 === 0 || (formatName === 'bcrypt' && bruteChecked % 10 === 0)) {
            terminalLogs.push(`[~] [Brute Force] Tried combinations up to "${cand}" (checked ${bruteChecked})...`);
          }

          const match = await verifyCandidate(cand);
          if (match) {
            isFinished = true;
            crackedPassword = cand;
            winner = 'Brute Force';
            resolve();
            return;
          }
        }

        currentCounter = end;
        if (currentCounter >= maxBruteAttempts) {
          terminalLogs.push(`[-] [Brute Force] Safety limit reached. Checked ${bruteChecked} combinations.`);
          resolve();
        } else {
          setImmediate(checkNext);
        }
      };

      terminalLogs.push(`[+] [Brute Force] Started incremental check (charset size: ${bruteCharset.length}).`);
      setImmediate(checkNext);
    });
  };

  // Race all three attacks concurrently
  await Promise.all([runCustomAttack(), runStandardAttack(), runBruteForceAttack()]);

  return { crackedPassword, winner, terminalLogs };
};

const runJTRConcurrentCracking = (targetHash, formatName) => {
  return new Promise(async (resolve) => {
    let isFinished = false;
    let crackedPassword = null;
    let winner = null;
    const terminalLogs = [];

    const customPot = 'custom.pot';
    const standardPot = 'standard.pot';
    const brutePot = 'brute.pot';

    const customPotPath = path.join(process.cwd(), customPot);
    const standardPotPath = path.join(process.cwd(), standardPot);
    const brutePotPath = path.join(process.cwd(), brutePot);

    const customSession = 'custom';
    const standardSession = 'standard';
    const bruteSession = 'brute';

    const cleanSessionFiles = (sessionName) => {
      try {
        const recFile = path.join(process.cwd(), `${sessionName}.rec`);
        if (fs.existsSync(recFile)) fs.unlinkSync(recFile);
      } catch (e) {}
    };

    [customPotPath, standardPotPath, brutePotPath].forEach(p => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {}
    });
    [customSession, standardSession, bruteSession].forEach(cleanSessionFiles);

    terminalLogs.push(`[*] Launching John the Ripper Parallel Attacks...`);

    const attacks = [
      {
        name: 'Custom Dictionary',
        cmd: `john --format=${formatName} --pot=${customPot} --session=${customSession} --wordlist=custom_wordlist.txt hash.txt`,
        pot: customPot,
        session: customSession
      },
      {
        name: 'Standard Dictionary',
        cmd: `john --format=${formatName} --pot=${standardPot} --session=${standardSession} --wordlist=rockyou.txt hash.txt`,
        pot: standardPot,
        session: standardSession
      },
      {
        name: 'Brute Force',
        cmd: `john --format=${formatName} --pot=${brutePot} --session=${bruteSession} --incremental hash.txt`,
        pot: brutePot,
        session: bruteSession
      }
    ];

    const processes = [];

    attacks.forEach(attack => {
      terminalLogs.push(`[+] [JTR ${attack.name}] Started command: $ ${attack.cmd}`);
      
      const proc = exec(attack.cmd, (error, stdout, stderr) => {
        proc.exited = true;
        if (error && error.signal === 'SIGTERM') {
          return;
        }
        if (stdout) {
          terminalLogs.push(`[JTR ${attack.name} STDOUT] ${stdout.trim()}`);
        }
        if (stderr) {
          const cleanStderr = stderr.trim();
          if (cleanStderr && !cleanStderr.includes('Command line') && !cleanStderr.includes('Press Ctrl-C')) {
            terminalLogs.push(`[JTR ${attack.name}] ${cleanStderr}`);
          }
        }
      });
      
      proc.exited = false;
      processes.push({ proc, ...attack });
    });

    const intervalId = setInterval(async () => {
      if (isFinished) {
        clearInterval(intervalId);
        return;
      }

      for (const attack of attacks) {
        const potFilePath = path.join(process.cwd(), attack.pot);
        if (fs.existsSync(potFilePath) && fs.statSync(potFilePath).size > 0) {
          const showCmd = `john --show --format=${formatName} --pot=${attack.pot} hash.txt`;
          const showResult = await runCommand(showCmd);
          if (showResult.stdout && showResult.stdout.includes(':')) {
            crackedPassword = showResult.stdout.split(':')[1].trim().split('\n')[0];
            if (crackedPassword) {
              isFinished = true;
              winner = attack.name;
              terminalLogs.push(`\n[+] [JTR ${attack.name}] CRACK SUCCESSFUL! Password found in ${attack.pot}`);
              clearInterval(intervalId);
              
              processes.forEach(p => {
                try {
                  p.proc.kill();
                } catch (err) {}
              });

              resolve({ crackedPassword, winner, terminalLogs });
              return;
            }
          }
        }
      }

      const allExited = processes.every(p => p.proc.exited);
      if (allExited) {
        clearInterval(intervalId);
        terminalLogs.push(`\n[-] All JTR parallel processes have exited.`);
        resolve({ crackedPassword: null, winner: null, terminalLogs });
      }
    }, 200);

    setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        clearInterval(intervalId);
        terminalLogs.push(`\n[!] JTR attack timeout reached (25s limit).`);
        processes.forEach(p => {
          try {
            p.proc.kill();
          } catch (err) {}
        });
        resolve({ crackedPassword: null, winner: null, terminalLogs });
      }
    }, 25000);
  });
};

const runConcurrentCrackingSuite = async (user, targetHash) => {
  const startTime = Date.now();
  let crackedPassword = null;
  let winner = null;
  let terminalLogs = [];
  let usedRealJohn = false;

  const formatName = targetHash.startsWith('$1$') ? 'md5crypt' : 'bcrypt';

  // 1. Setup Custom Wordlist
  const customWordlist = generateWordlistJS(
    user.name,
    user.dob,
    user.collegeName,
    user.favoriteWord
  );
  const customWordlistPath = path.join(process.cwd(), 'custom_wordlist.txt');
  fs.writeFileSync(customWordlistPath, customWordlist.join('\n'));

  // 2. Setup Standard Dictionary (rockyou)
  ensureStandardDictionary();
  const rockyouPath = path.join(process.cwd(), 'rockyou.txt');

  // 3. Save target hash to disk
  const hashPath = path.join(process.cwd(), 'hash.txt');
  fs.writeFileSync(hashPath, targetHash + '\n');

  terminalLogs.push(`[+] Wordlist generated : ${customWordlist.length} candidate passwords`);
  terminalLogs.push(`[+] Saved custom wordlist to : custom_wordlist.txt`);
  terminalLogs.push(`[+] Stored target hash       : hash.txt (${formatName})`);

  try {
    // Check JTR binary availability
    const checkResult = await runCommand('john');
    if (checkResult.error && (checkResult.error.message.includes('not found') || checkResult.error.message.includes('not recognized') || checkResult.error.code === 127)) {
      throw new Error('JTR binary not found');
    }

    usedRealJohn = true;
    const crackResult = await runJTRConcurrentCracking(targetHash, formatName);
    crackedPassword = crackResult.crackedPassword;
    winner = crackResult.winner;
    terminalLogs = [...terminalLogs, ...crackResult.terminalLogs];
  } catch (e) {
    usedRealJohn = false;
    terminalLogs.push(`[!] JTR binary execution skipped (not found in system PATH or failed to start).`);
    terminalLogs.push(`[*] Falling back to JavaScript Cryptographic engine (concurrent loops)...`);

    const dictContent = fs.readFileSync(rockyouPath, 'utf8');
    const standardWordlist = dictContent.split(/\r?\n/).filter(Boolean).slice(0, 50000);

    const crackResult = await runJSConcurrentCracking(targetHash, customWordlist, standardWordlist, formatName);
    crackedPassword = crackResult.crackedPassword;
    winner = crackResult.winner;
    terminalLogs = [...terminalLogs, ...crackResult.terminalLogs];
  }

  const endTime = Date.now();
  const timeTakenSec = ((endTime - startTime) / 1000).toFixed(2);

  // Clean up JTR artifacts
  const filesToCleanup = [
    'hash.txt',
    'custom.pot', 'standard.pot', 'brute.pot',
    'custom.rec', 'standard.rec', 'brute.rec',
    'john.rec', 'john.pot'
  ];
  filesToCleanup.forEach(file => {
    try {
      const p = path.join(process.cwd(), file);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (err) {}
  });

  return {
    cracked: !!crackedPassword,
    password: crackedPassword,
    winner,
    timeTaken: timeTakenSec,
    logs: terminalLogs,
    usedRealJohn
  };
};

export const jtrRecover = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > user.resetOtpExpires) {
      return res.status(400).json({ success: false, message: 'OTP code has expired' });
    }

    const targetHash = user.passwordMd5Crypt || user.password;
    
    console.log(`\n=== JTR RECOVERY AUDIT RUNNING (CONCURRENT RACES) ===`);
    console.log('User Email:', user.email);
    console.log('Format detected:', targetHash.startsWith('$1$') ? 'md5crypt' : 'bcrypt');
    console.log('Target hash value:', targetHash);
    console.log('====================================================\n');

    const result = await runConcurrentCrackingSuite(user, targetHash);

    res.json({
      success: true,
      cracked: result.cracked,
      password: result.password,
      winner: result.winner,
      timeTaken: result.timeTaken,
      logs: result.logs,
      usedRealJohn: result.usedRealJohn
    });

  } catch (error) {
    console.error('JTR Recovery Error:', error);
    res.status(500).json({ success: false, message: 'Server error during JTR password recovery' });
  }
};

export const jtrAudit = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const targetHash = user.passwordMd5Crypt || user.password;

    console.log(`\n=== JTR SECURITY PROFILE AUDIT RUNNING (CONCURRENT RACES) ===`);
    console.log('User Email:', user.email);
    console.log('Format detected:', targetHash.startsWith('$1$') ? 'md5crypt' : 'bcrypt');
    console.log('Target hash value:', targetHash);
    console.log('============================================================\n');

    const result = await runConcurrentCrackingSuite(user, targetHash);

    res.json({
      success: true,
      cracked: result.cracked,
      password: result.password,
      winner: result.winner,
      timeTaken: result.timeTaken,
      logs: result.logs,
      usedRealJohn: result.usedRealJohn
    });

  } catch (error) {
    console.error('JTR Audit Error:', error);
    res.status(500).json({ success: false, message: 'Server error during JTR password audit' });
  }
};
