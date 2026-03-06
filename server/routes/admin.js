import express from 'express';
import crypto from 'crypto';
import supabase from '../supabaseAdmin.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

// Apply auth and admin middleware to all routes in this router
router.use(requireAuth, requireAdmin);

// GET all users (with agent counts and limits)
router.get('/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, email, is_active, agent_count, agent_limit, is_lifetime')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ users: data });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PATCH user entitlements
router.patch('/users/:id/entitlements', async (req, res) => {
    const { id } = req.params;
    const { agent_limit, is_lifetime } = req.body;

    try {
        const { error } = await supabase
            .from('users')
            .update({
                agent_limit: parseInt(agent_limit),
                is_lifetime: !!is_lifetime
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'User entitlements updated successfully' });
    } catch (err) {
        console.error('Error updating entitlements:', err);
        res.status(500).json({ error: 'Failed to update entitlements' });
    }
});

// POST to activate a user and generate their first API key
router.post('/activate', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
    }

    try {
        // 1. Check if user is already active
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('is_active')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found in public.users table' });
        }

        if (user.is_active) {
            return res.status(400).json({ error: 'User is already active' });
        }

        // 2. Generate the unique API Key
        const rawApiKey = 'va_test_' + crypto.randomBytes(16).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
        const keyPreview = rawApiKey.slice(-8);

        // 3. Mark active in users table
        const { error: updateError } = await supabase
            .from('users')
            .update({ is_active: true })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 4. Insert into api_keys table
        const { error: keyError } = await supabase
            .from('api_keys')
            .insert({
                user_id: userId,
                key_hash: keyHash,
                key_preview: keyPreview
            });

        if (keyError) throw keyError;

        // 5. Return the plaintext key exactly ONCE for the admin to see/copy
        res.json({
            message: 'User activated successfully!',
            plaintext_key: rawApiKey
        });

    } catch (err) {
        console.error('Error activating user:', err);
        res.status(500).json({ error: 'Failed to activate user' });
    }
});

// GET all agents with owner email
router.get('/agents', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('agent_configs')
            .select(`
                *,
                users (email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ agents: data });
    } catch (err) {
        console.error('Error fetching admin agents:', err);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// GET the Global Master Prompt
router.get('/master-prompt', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('master_prompt')
            .eq('id', 'master')
            .single();

        if (error) throw error;
        res.json({ master_prompt: data.master_prompt });
    } catch (err) {
        console.error('Error fetching master prompt:', err);
        res.status(500).json({ error: 'Failed to fetch master prompt' });
    }
});

// POST to update the Global Master Prompt
router.post('/master-prompt', async (req, res) => {
    const { master_prompt } = req.body;

    if (!master_prompt) {
        return res.status(400).json({ error: 'Master prompt cannot be empty' });
    }

    // Validation: Ensure mandatory variables are present
    const required = ['{agent_name}', '{company_name}', '{context}', '{questions}'];
    const missing = required.filter(v => !master_prompt.includes(v));

    if (missing.length > 0) {
        return res.status(400).json({
            error: `Missing mandatory variables: ${missing.join(', ')}. All variables must be present to ensure agent functionality.`
        });
    }

    try {
        const { error } = await supabase
            .from('system_settings')
            .update({ master_prompt })
            .eq('id', 'master');

        if (error) throw error;
        res.json({ message: 'Global Master Prompt updated successfully' });
    } catch (err) {
        console.error('Error updating master prompt:', err);
        res.status(500).json({ error: 'Failed to update master prompt' });
    }
});

export default router;
