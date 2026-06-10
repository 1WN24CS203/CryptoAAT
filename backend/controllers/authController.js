import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { exec, execSync, spawn } from 'child_process';
import User from '../models/User.js';
import { analyzePassword } from '../utils/passwordAnalyzer.js';
import { generateWordlistJS } from '../utils/customWordlist.js';

// ─────────────────────────────────────────────────────────────────────────────
// ATTACK DURATION CONFIGURATION
// Adjust the values below (in milliseconds) to control how long each
// JTR attack is allowed to run before moving on / timing out.
// ─────────────────────────────────────────────────────────────────────────────
const ATTACK_DURATIONS = {
  customWordlist: 25000,   // ms — Custom Wordlist attack   (sequential / live stream)
  rockyouDict: 25000,   // ms — rockyou.txt Dictionary   (sequential / live stream)
  bruteForce: 25000,   // ms — Incremental Brute Force  (sequential / live stream)
  concurrentTotal: 30000,   // ms — Overall cap for ALL parallel attacks (jtrRecover / jtrAudit)
};
// ─────────────────────────────────────────────────────────────────────────────

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Helper to execute commands synchronously/asynchronously
const runCommand = (cmd) => {
  return new Promise((resolve) => {
    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
};

// Generates a standard FreeBSD-compatible md5crypt ($1$) hash of a password
const getMd5Crypt = (password, salt = 'aat') => {
  return new Promise((resolve) => {
    if (salt.startsWith("$1$")) salt = salt.slice(3);
    const pos = salt.indexOf("$");
    if (pos !== -1) salt = salt.slice(0, pos);
    salt = salt.slice(0, 8);

    const key = password;
    let ctx = crypto.createHash('md5');
    ctx.update(key);
    ctx.update("$1$");
    ctx.update(salt);

    let ctx1 = crypto.createHash('md5');
    ctx1.update(key);
    ctx1.update(salt);
    ctx1.update(key);
    let final = ctx1.digest();

    let pl = key.length;
    while (pl > 0) {
      ctx.update(final.slice(0, Math.min(pl, 16)));
      pl -= 16;
    }

    for (let i = key.length; i > 0; i >>= 1) {
      if ((i & 1) !== 0) {
        ctx.update(Buffer.from([0]));
      } else {
        ctx.update(Buffer.from([key.charCodeAt(0)]));
      }
    }

    final = ctx.digest();

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

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const analysis = analyzePassword(password, {
      name,
      email,
      dob,
      collegeName,
      favoriteWord,
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const md5CryptPassword = await getMd5Crypt(password);

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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 15 * 60 * 1000; // 15 minutes

    user.resetOtp = otp;
    user.resetOtpExpires = expiryTime;
    await user.save();

    console.log('\n\x1b[36m==================================================\x1b[0m');
    console.log('\x1b[33m                    CRYPTOAAT OTP                 \x1b[0m');
    console.log(`\x1b[37m  OTP Code for: ${email} sent\x1b[0m`);
    // console.log(`\x1b[42m\x1b[30m  OTP CODE: ${otp}  \x1b[0m`);
    console.log('\x1b[37m  Expires in: 15 minutes\x1b[0m');
    console.log('\x1b[36m==================================================\n\x1b[0m');

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

    const analysis = analyzePassword(newPassword, {
      name: user.name,
      email: user.email,
      dob: user.dob,
      collegeName: user.collegeName,
      favoriteWord: user.favoriteWord,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordMd5Crypt = await getMd5Crypt(newPassword);

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
 * @access  Public
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

// Locates the actual Kali Linux rockyou.txt wordlist and extracts it locally if compressed
const getRockYouPath = () => {
  const standardPaths = [
    '/usr/share/wordlists/rockyou.txt',
    path.join(process.cwd(), 'rockyou.txt'),
  ];

  for (const p of standardPaths) {
    if (fs.existsSync(p) && fs.statSync(p).size > 0) {
      return p;
    }
  }

  // Auto-extraction system for Kali Linux compressed wordlist
  const compressedKaliPath = '/usr/share/wordlists/rockyou.txt.gz';
  if (fs.existsSync(compressedKaliPath)) {
    try {
      const localRockyou = path.join(process.cwd(), 'rockyou.txt');
      if (!fs.existsSync(localRockyou) || fs.statSync(localRockyou).size === 0) {
        console.log(`[*] Auto-extracting ${compressedKaliPath} to ${localRockyou}...`);
        execSync(`gunzip -c "${compressedKaliPath}" > "${localRockyou}"`);
      }
      return localRockyou;
    } catch (err) {
      console.error('[!] Failed to auto-extract rockyou.txt.gz:', err);
    }
  }

  // Fallback path
  return '/usr/share/wordlists/rockyou.txt';
};

// Helper for cleaning up unique files
const cleanupFiles = (files) => {
  files.forEach(file => {
    try {
      const p = path.join(process.cwd(), file);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) { }
  });
};

// Run JTR against target hash using actual binary execution
const runJTRConcurrentCracking = (targetHash, formatName, user) => {
  return new Promise(async (resolve) => {
    let isFinished = false;
    let crackedPassword = null;
    let winner = null;
    const terminalLogs = [];

    // Unique IDs for parallel safety
    const uniqueId = Math.random().toString(36).substring(7);
    const hashFile = `hash_${uniqueId}.txt`;
    const hashPath = path.join(process.cwd(), hashFile);
    fs.writeFileSync(hashPath, targetHash + '\n');

    const customPotFile = `custom_${uniqueId}.pot`;
    const standardPotFile = `standard_${uniqueId}.pot`;
    const brutePotFile = `brute_${uniqueId}.pot`;

    const customSession = `custom_${uniqueId}`;
    const standardSession = `standard_${uniqueId}`;
    const bruteSession = `brute_${uniqueId}`;

    const rockyouPath = getRockYouPath();

    terminalLogs.push(`[*] Target Hash written to: ${hashFile}`);
    terminalLogs.push(`[*] Detecting wordlists for JTR attacks...`);
    terminalLogs.push(`[+] Custom Wordlist path: custom_wordlist.txt`);
    terminalLogs.push(`[+] Standard Dictionary (rockyou.txt) path: ${rockyouPath}`);

    // Set up real john commands
    const attacks = [
      {
        name: 'Custom Wordlist',
        cmd: `john --format=${formatName} --pot=${customPotFile} --session=${customSession} --wordlist=custom_wordlist.txt ${hashFile}`,
        pot: customPotFile,
        session: customSession
      },
      {
        name: 'Standard Dictionary (rockyou.txt)',
        cmd: `john --format=${formatName} --pot=${standardPotFile} --session=${standardSession} --wordlist="${rockyouPath}" ${hashFile}`,
        pot: standardPotFile,
        session: standardSession
      },
      {
        name: 'Brute Force Incremental',
        cmd: `john --format=${formatName} --pot=${brutePotFile} --session=${bruteSession} --incremental ${hashFile}`,
        pot: brutePotFile,
        session: bruteSession
      }
    ];

    const processes = [];

    terminalLogs.push(`\n[*] Executing Parallel John the Ripper Attacks:`);

    attacks.forEach(attack => {
      terminalLogs.push(`[JTR ${attack.name}] Running: ${attack.cmd}`);

      const proc = exec(attack.cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
        proc.exited = true;
        if (stdout) {
          terminalLogs.push(`[JTR ${attack.name} STDOUT] ${stdout.trim()}`);
        }
        if (stderr) {
          const cleanStderr = stderr.trim();
          if (cleanStderr && !cleanStderr.includes('Press Ctrl-C') && !cleanStderr.includes('Command line')) {
            terminalLogs.push(`[JTR ${attack.name} STDERR] ${cleanStderr}`);
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
        const potPath = path.join(process.cwd(), attack.pot);
        if (fs.existsSync(potPath) && fs.statSync(potPath).size > 0) {
          const showCmd = `john --show --format=${formatName} --pot=${attack.pot} ${hashFile}`;
          const showResult = await new Promise((resCmd) => {
            exec(showCmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
              resCmd({ stdout, stderr });
            });
          });

          if (showResult.stdout && showResult.stdout.includes(':')) {
            const parts = showResult.stdout.split('\n')[0].split(':');
            if (parts.length >= 2) {
              crackedPassword = parts.slice(1).join(':').trim();
              if (crackedPassword) {
                isFinished = true;
                winner = attack.name;
                terminalLogs.push(`\n[+] [SUCCESS] JTR ${attack.name} cracked the password!`);
                clearInterval(intervalId);

                processes.forEach(p => {
                  try { p.proc.kill('SIGKILL'); } catch (e) { }
                });

                cleanupFiles([
                  hashFile, customPotFile, standardPotFile, brutePotFile,
                  `${customSession}.rec`, `${standardSession}.rec`, `${bruteSession}.rec`
                ]);
                resolve({ cracked: true, crackedPassword, winner, terminalLogs });
                return;
              }
            }
          }
        }
      }

      const allExited = processes.every(p => p.proc.exited);
      if (allExited) {
        clearInterval(intervalId);

        // Final pot check
        for (const attack of attacks) {
          const potPath = path.join(process.cwd(), attack.pot);
          if (fs.existsSync(potPath) && fs.statSync(potPath).size > 0) {
            const showCmd = `john --show --format=${formatName} --pot=${attack.pot} ${hashFile}`;
            const showResult = await new Promise((resCmd) => {
              exec(showCmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
                resCmd({ stdout, stderr });
              });
            });
            if (showResult.stdout && showResult.stdout.includes(':')) {
              const parts = showResult.stdout.split('\n')[0].split(':');
              if (parts.length >= 2) {
                crackedPassword = parts.slice(1).join(':').trim();
                if (crackedPassword) {
                  winner = attack.name;
                  terminalLogs.push(`\n[+] [SUCCESS] JTR ${attack.name} cracked the password!`);
                  cleanupFiles([
                    hashFile, customPotFile, standardPotFile, brutePotFile,
                    `${customSession}.rec`, `${standardSession}.rec`, `${bruteSession}.rec`
                  ]);
                  resolve({ cracked: true, crackedPassword, winner, terminalLogs });
                  return;
                }
              }
            }
          }
        }

        terminalLogs.push(`\n[-] All JTR parallel processes exited. Password was NOT cracked.`);
        cleanupFiles([
          hashFile, customPotFile, standardPotFile, brutePotFile,
          `${customSession}.rec`, `${standardSession}.rec`, `${bruteSession}.rec`
        ]);
        resolve({ cracked: false, crackedPassword: null, winner: null, terminalLogs });
      }
    }, 500);

    setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        clearInterval(intervalId);
        terminalLogs.push(`\n[!] Timeout: JTR parallel attacks timed out after ${ATTACK_DURATIONS.concurrentTotal / 1000} seconds.`);
        processes.forEach(p => {
          try { p.proc.kill('SIGKILL'); } catch (e) { }
        });
        cleanupFiles([
          hashFile, customPotFile, standardPotFile, brutePotFile,
          `${customSession}.rec`, `${standardSession}.rec`, `${bruteSession}.rec`
        ]);
        resolve({ cracked: false, crackedPassword: null, winner: null, terminalLogs });
      }
    }, ATTACK_DURATIONS.concurrentTotal);
  });
};

// Core concurrency wrapper suite
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

  terminalLogs.push(`[+] Custom wordlist generated : ${customWordlist.length} candidate passwords`);
  terminalLogs.push(`[+] Saved custom wordlist to  : custom_wordlist.txt`);
  terminalLogs.push(`[+] Active Cryptographic Hash  : ${targetHash.substring(0, 15)}... (${formatName})`);

  try {
    // Check JTR binary availability in PATH or standard Kali path
    const checkResult = await runCommand('john');
    if (checkResult.error && (checkResult.error.message.includes('not found') || checkResult.error.message.includes('not recognized') || checkResult.error.code === 127)) {
      throw new Error('John the Ripper (JTR) binary not found on the system PATH.');
    }

    usedRealJohn = true;
    const crackResult = await runJTRConcurrentCracking(targetHash, formatName, user);
    crackedPassword = crackResult.crackedPassword;
    winner = crackResult.winner;
    terminalLogs = [...terminalLogs, ...crackResult.terminalLogs];
  } catch (e) {
    usedRealJohn = false;
    terminalLogs.push(`[!] JTR execution failed: ${e.message}`);
    crackedPassword = null;
    winner = null;
  }

  const endTime = Date.now();
  const timeTakenSec = ((endTime - startTime) / 1000).toFixed(2);

  // Final cleanup of any standard remaining .rec or .pot files
  cleanupFiles(['custom_wordlist.txt']);

  return {
    cracked: !!crackedPassword,
    password: crackedPassword,
    winner,
    timeTaken: timeTakenSec,
    logs: terminalLogs,
    usedRealJohn
  };
};

/**
 * @desc    Forgot Password JTR recovery handler
 * @route   POST /api/auth/jtr-recover
 * @access  Public
 */
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

    console.log(`\n=== JTR PASSWORD RECOVERY RUNNING (CONCURRENT RACES) ===`);
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

/**
 * @desc    JTR Live Streaming via SSE — runs real john binary, pipes stdout/stderr in real-time
 * @route   GET /api/auth/jtr-stream
 * @access  Public
 */
export const jtrStream = async (req, res) => {
  // SSE headers — keep connection alive and stream lines
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  let isFinished = false;
  let activeProc = null;

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (e) { }
    }
  };

  const endStream = () => {
    if (!isFinished) {
      isFinished = true;
      if (activeProc && !activeProc.killed) {
        try { activeProc.kill('SIGKILL'); } catch (e) { }
      }
      if (!res.writableEnded) res.end();
    }
  };

  req.on('close', endStream);

  try {
    const { email, otp } = req.query;

    if (!email || !otp) {
      sendEvent({ type: 'error', message: 'Email and OTP are required' });
      return endStream();
    }

    const user = await User.findOne({ email });
    if (!user) {
      sendEvent({ type: 'error', message: 'User not found' });
      return endStream();
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      sendEvent({ type: 'error', message: 'Invalid OTP code' });
      return endStream();
    }

    if (new Date() > user.resetOtpExpires) {
      sendEvent({ type: 'error', message: 'OTP has expired' });
      return endStream();
    }

    const targetHash = user.passwordMd5Crypt || user.password;
    const formatName = targetHash.startsWith('$1$') ? 'md5crypt' : 'bcrypt';
    const rockyouPath = getRockYouPath();

    // Unique session files
    const uid = Math.random().toString(36).substring(7);
    const hashFile = path.join(process.cwd(), `jtr_hash_${uid}.txt`);
    const potFile = path.join(process.cwd(), `jtr_pot_${uid}.pot`);
    const customWlFile = path.join(process.cwd(), `jtr_cwl_${uid}.txt`);

    // Write target hash
    fs.writeFileSync(hashFile, targetHash + '\n');

    // Generate & write custom wordlist
    const customWordlist = generateWordlistJS(user.name, user.dob, user.collegeName, user.favoriteWord);
    fs.writeFileSync(customWlFile, customWordlist.join('\n'));

    const cleanup = () => {
      [hashFile, potFile, customWlFile].forEach(f => {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { }
      });
    };

    const startTime = Date.now();

    // ── Banner ───────────────────────────────────────────────────────────
    sendEvent({ type: 'log', line: '┌─────────────────────────────────────────────────────┐' });
    sendEvent({ type: 'log', line: '│       JOHN THE RIPPER  ·  LIVE EXECUTION            │' });
    sendEvent({ type: 'log', line: '└─────────────────────────────────────────────────────┘' });
    sendEvent({ type: 'log', line: '' });
    sendEvent({ type: 'log', line: `[*] Target account  : ${email}` });
    sendEvent({ type: 'log', line: `[*] Hash format     : ${formatName}` });
    sendEvent({ type: 'log', line: `[*] Hash value      : ${targetHash}` });
    sendEvent({ type: 'log', line: `[*] Custom wordlist : ${customWordlist.length} candidates (name/dob/college/word combos)` });
    sendEvent({ type: 'log', line: `[*] Rockyou path    : ${rockyouPath}` });
    sendEvent({ type: 'log', line: '' });

    // ── Helper: spawn john and pipe output live ───────────────────────────
    const runJohnLive = (attackLabel, johnArgs, timeoutMs) => {
      return new Promise((resolve) => {
        if (isFinished) return resolve(null);

        sendEvent({ type: 'log', line: `━━━━ ${attackLabel} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` });
        sendEvent({ type: 'log', line: `$ john ${johnArgs.join(' ')}` });
        sendEvent({ type: 'log', line: '' });

        const proc = spawn('john', johnArgs, {
          cwd: process.cwd(),
          env: { ...process.env, JOHN_NO_SIGSEGV: '1' }
        });
        activeProc = proc;

        // Pipe stdout live
        proc.stdout.on('data', (chunk) => {
          chunk.toString().split('\n').forEach(line => {
            if (line.trim()) sendEvent({ type: 'log', line });
          });
        });

        // Pipe stderr live (john writes progress to stderr)
        proc.stderr.on('data', (chunk) => {
          chunk.toString().split('\n').forEach(line => {
            const l = line.trim();
            if (l && !l.startsWith('Press') && !l.startsWith('(To see')) {
              sendEvent({ type: 'log', line: l });
            }
          });
        });

        const timeoutId = setTimeout(() => {
          if (!proc.killed) {
            sendEvent({ type: 'log', line: `[!] Attack timeout (${timeoutMs / 1000}s) — moving to next strategy...` });
            proc.kill('SIGKILL');
          }
        }, timeoutMs);

        proc.on('close', async () => {
          clearTimeout(timeoutId);
          activeProc = null;

          // Check pot file for cracked result
          const showResult = await new Promise(r => {
            exec(
              `john --show --format=${formatName} --pot=${potFile} ${hashFile}`,
              { cwd: process.cwd() },
              (err, stdout) => r(stdout || '')
            );
          });

          if (showResult && showResult.includes(':')) {
            const firstLine = showResult.split('\n')[0];
            const colonIdx = firstLine.indexOf(':');
            if (colonIdx > 0) {
              const pw = firstLine.substring(colonIdx + 1).trim();
              if (pw) return resolve(pw);
            }
          }
          resolve(null);
        });

        proc.on('error', (err) => {
          clearTimeout(timeoutId);
          sendEvent({ type: 'log', line: `[!] spawn error: ${err.message}` });
          resolve(null);
        });
      });
    };

    let crackedPassword = null;
    let winner = null;

    // ── Attack 1: Custom Wordlist ────────────────────────────────────────
    const r1 = await runJohnLive('ATTACK 1/3 — Custom Wordlist', [
      `--format=${formatName}`,
      `--pot=${potFile}`,
      `--wordlist=${customWlFile}`,
      hashFile
    ], ATTACK_DURATIONS.customWordlist);
    if (r1) { crackedPassword = r1; winner = 'Custom Wordlist'; }

    // ── Attack 2: Rockyou Dictionary ────────────────────────────────────
    if (!crackedPassword && !isFinished) {
      sendEvent({ type: 'log', line: '' });
      const r2 = await runJohnLive('ATTACK 2/3 — rockyou.txt Dictionary', [
        `--format=${formatName}`,
        `--pot=${potFile}`,
        `--wordlist=${rockyouPath}`,
        hashFile
      ], ATTACK_DURATIONS.rockyouDict);
      if (r2) { crackedPassword = r2; winner = 'rockyou.txt Dictionary'; }
    }

    // ── Attack 3: Incremental Brute Force ───────────────────────────────
    if (!crackedPassword && !isFinished) {
      sendEvent({ type: 'log', line: '' });
      const r3 = await runJohnLive('ATTACK 3/3 — Incremental Brute Force', [
        `--format=${formatName}`,
        `--pot=${potFile}`,
        '--incremental',
        hashFile
      ], ATTACK_DURATIONS.bruteForce);
      if (r3) { crackedPassword = r3; winner = 'Incremental Brute Force'; }
    }

    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

    sendEvent({ type: 'log', line: '' });
    if (crackedPassword) {
      sendEvent({ type: 'log', line: `[+] ══════════════════════════════════════════════════` });
      sendEvent({ type: 'log', line: `[+] SUCCESS  — cracked by: ${winner}` });
      sendEvent({ type: 'log', line: `[+] Password : ${crackedPassword}` });
      sendEvent({ type: 'log', line: `[+] Time     : ${timeTaken}s` });
      sendEvent({ type: 'log', line: `[+] ══════════════════════════════════════════════════` });
    } else {
      sendEvent({ type: 'log', line: `[-] ══════════════════════════════════════════════════` });
      sendEvent({ type: 'log', line: `[-] All attacks exhausted — password NOT cracked` });
      sendEvent({ type: 'log', line: `[-] Time     : ${timeTaken}s` });
      sendEvent({ type: 'log', line: `[-] ══════════════════════════════════════════════════` });
    }

    cleanup();
    sendEvent({ type: 'done', cracked: !!crackedPassword, password: crackedPassword, winner, timeTaken });
    endStream();

  } catch (err) {
    console.error('JTR Stream Error:', err);
    sendEvent({ type: 'error', message: err.message });
    endStream();
  }
};

/**
 * @desc    Dashboard JTR active password audit
 * @route   POST /api/auth/jtr-audit
 * @access  Private
 */
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
