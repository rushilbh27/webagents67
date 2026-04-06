import express from 'express';
import supabase from '../supabaseAdmin.js';

const router = express.Router();

router.post('/save-answers', async (req, res) => {
    const { agent_config_id, client_name, phone_number, responses, call_id, call_duration } = req.body;

    if (!agent_config_id) {
        return res.status(400).json({ error: 'Missing agent_config_id.' });
    }

    // Fetch agent config for webhook_url and business details
    const { data: agentConfig, error: configError } = await supabase
        .from('agent_configs')
        .select('business_name, agent_name, webhook_url')
        .eq('id', agent_config_id)
        .single();

    if (configError) {
        console.error('Error fetching agent config:', configError);
    }

    // Save to database
    const { error } = await supabase
        .from('call_responses')
        .insert({
            agent_config_id,
            client_name: client_name || null,
            phone_number: phone_number || null,
            responses: responses || [],
            call_id: call_id || null,
            call_duration: call_duration || null
        });

    if (error) {
        console.error('Save answers error:', error);
        return res.status(500).json({ error: 'Failed to save call responses.' });
    }

    // POST to tenant webhook if configured
    if (agentConfig?.webhook_url) {
        const webhookPayload = {
            event: 'call.completed',
            timestamp: new Date().toISOString(),
            call_id: call_id || null,
            call_duration: call_duration || null,
            agent_config_id,
            business_name: agentConfig.business_name || null,
            agent_name: agentConfig.agent_name || null,
            client_name: client_name || null,
            phone_number: phone_number || null,
            responses: responses || []
        };

        try {
            const webhookRes = await fetch(agentConfig.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload),
                signal: AbortSignal.timeout(10000) // 10s timeout
            });
            console.log(`Webhook delivered to ${agentConfig.webhook_url} — status: ${webhookRes.status}`);
        } catch (webhookErr) {
            console.error('Webhook delivery failed:', webhookErr.message);
            // Don't fail the response — webhook is best-effort
        }
    }

    res.json({ success: true });
});

export default router;
