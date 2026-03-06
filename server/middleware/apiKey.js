import crypto from 'crypto';
import supabase from '../supabaseAdmin.js';

export function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

export async function apiKeyMiddleware(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing API key. Provide x-api-key header.' });
    }

    const keyHash = hashKey(apiKey);

    // Look up the hashed key and join with users table
    const { data: keyRow, error: keyError } = await supabase
        .from('api_keys')
        .select('id, user_id, users ( id, email, is_active, agent_count )')
        .eq('key_hash', keyHash)
        .single();

    if (keyError || !keyRow) {
        return res.status(401).json({ error: 'Invalid API key.' });
    }

    const user = keyRow.users;

    if (!user.is_active) {
        return res.status(402).json({ error: 'Account not yet activated. Contact admin.' });
    }

    // Attach user info for downstream routes
    req.apiKeyId = keyRow.id;
    req.user = user;
    next();
}
