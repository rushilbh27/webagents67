import express from 'express';
import crypto from 'crypto';
import supabase from '../supabaseAdmin.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// Apply auth middleware
router.use(requireAuth);

// GET User Dashboard Data
router.get('/dashboard', async (req, res) => {
    const userId = req.user.id;

    try {
        // Fetch user stats
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('is_active, agent_count, email')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        // Fetch api key preview
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('key_preview')
            .eq('user_id', userId)
            .single();

        // It is possible keyData doesn't exist yet if they haven't been activated
        const keyPreview = keyData ? `va_test_********${keyData.key_preview}` : null;

        // Fetch agent configs
        const { data: agents, error: agentsError } = await supabase
            .from('agent_configs')
            .select('id, business_name, business_context, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (agentsError) throw agentsError;

        // Fetch call responses for the user's agents
        const agentIds = agents.map(a => a.id);
        let leads = [];

        if (agentIds.length > 0) {
            const { data: leadData, error: leadsError } = await supabase
                .from('call_responses')
                .select('id, agent_config_id, client_name, phone_number, responses, created_at')
                .in('agent_config_id', agentIds)
                .order('created_at', { ascending: false });

            if (leadsError) throw leadsError;

            // Map the agent name onto the lead for easier display
            leads = leadData.map(lead => ({
                ...lead,
                agent_name: agents.find(a => a.id === lead.agent_config_id)?.business_name || 'Unknown Agent'
            }));
        }

        res.json({
            user: {
                email: user.email,
                is_active: user.is_active,
                agent_count: user.agent_count,
                api_key_masked: keyPreview
            },
            agents,
            leads
        });

    } catch (err) {
        console.error('Error fetching user dashboard:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// POST to regenerate their API key
router.post('/regenerate-key', async (req, res) => {
    const userId = req.user.id;

    try {
        // Generate new key
        const rawApiKey = 'va_test_' + crypto.randomBytes(16).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
        const keyPreview = rawApiKey.slice(-8);

        // Overwrite existing key in DB
        const { error: keyError } = await supabase
            .from('api_keys')
            .update({
                key_hash: keyHash,
                key_preview: keyPreview,
                created_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (keyError) throw keyError;

        res.json({
            message: 'API Key regenerated successfully. The old key is now permanently invalidated.',
            plaintext_key: rawApiKey
        });

    } catch (err) {
        console.error('Error regenerating key:', err);
        res.status(500).json({ error: 'Failed to regenerate API key' });
    }
});

export default router;
