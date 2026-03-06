export const requireAdmin = (req, res, next) => {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!req.user || !req.user.email) {
        return res.status(401).json({ error: 'Unauthorized: No user provided to admin check.' });
    }

    if (req.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
        console.log(`Forbidden: Admin check failed for ${req.user.email}. Expected ${adminEmail}`);
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }

    next();
};
