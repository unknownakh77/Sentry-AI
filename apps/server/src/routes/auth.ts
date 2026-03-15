import { Router } from 'express';
import { createSession, getSession, verifySession } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Login: Request OTP
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = '123456'; // Deterministic for demo/verification
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString(); // 10 mins

    createSession({
      id: sessionId,
      userEmail: email,
      otp,
      expiresAt,
      createdAt: new Date().toISOString()
    });

    // In a real app, we'd send an email here. For demo, we just log it and return it for convenience in testing.
    console.log(`[AUTH] OTP for ${email}: ${otp}`);
    
    res.json({ sessionId, message: 'OTP sent to email (check console for demo)' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP
router.post('/verify', async (req, res) => {
  try {
    const { sessionId, otp } = req.body;
    const session = getSession(sessionId);

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    if (session.otp === otp) {
      verifySession(sessionId);
      res.json({ 
        success: true, 
        userEmail: session.userEmail,
        isMfaTrusted: true
      });
    } else {
      res.status(401).json({ error: 'Invalid OTP' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
