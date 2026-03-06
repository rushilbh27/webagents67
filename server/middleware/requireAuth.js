import supabase from '../supabaseAdmin.js';

export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
        }

        const token = authHeader.split(' ')[1];
        console.log(`Verifying token (prefix: ${token?.substring(0, 10)}...)`);

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('Supabase Auth Error:', error?.message || 'No user found');
            return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
        }

        console.log(`Auth successful for: ${user.email}`);
        req.user = user;
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
};
