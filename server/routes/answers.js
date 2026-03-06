import express from 'express';
import supabase from '../supabaseAdmin.js';

const router = express.Router();

router.post('/save-answers', async (req, res) => {
    const { agent_config_id, client_name, phone_number, responses } = req.body;

    if (!agent_config_id) {
        return res.status(400).json({ error: 'Missing agent_config_id.' });
    }

    const { error } = await supabase
        .from('call_responses')
        .insert({
            agent_config_id,
            client_name: client_name || null,
            phone_number: phone_number || null,
            responses: responses || []
        });

    if (error) {
        console.error('Save answers error:', error);
        return res.status(500).json({ error: 'Failed to save call responses.' });
    }

    res.json({ success: true });
});

export default router;
