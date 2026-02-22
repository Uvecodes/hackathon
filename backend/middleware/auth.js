const { auth } = require('../config/firebase');

/**
 * Firebase Auth Middleware
 * Verifies Firebase ID token from Authorization header
 * Attaches decoded user data (uid, email) to req.user
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
    }

    const idToken = parts[1];

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || decodedToken.uid,
      };
      next();
    } catch (err) {
      if (err.code === 'auth/id-token-expired') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        });
      }
      if (err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};
