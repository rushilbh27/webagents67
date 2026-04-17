import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../supabaseAdmin.js';
import { apiKeyMiddleware } from '../middleware/apiKey.js';

const router = express.Router();

router.post('/create-agent', apiKeyMiddleware, async (req, res) => {
    // --- Mapping B2B Fields to Internal Schema ---
    const {
        agent_name,
        company_name,
        context,
        business_name,
        business_context,
        greeting,
        questions: bodyQuestions,
        to,
        webhook_url,
        voice_id
    } = req.body;

    // Support for flattened question1...question10
    const flattenedQuestions = [];
    for (let i = 1; i <= 10; i++) {
        const q = req.body[`question${i}`];
        if (q && typeof q === 'string' && q.trim() !== '') {
            flattenedQuestions.push(q.trim());
        }
    }

    const finalBusinessName = company_name || business_name;
    const finalBusinessContext = context || business_context;
    const finalQuestions = (bodyQuestions && Array.isArray(bodyQuestions)) ? bodyQuestions : flattenedQuestions;

    // --- Validate body ---
    if (!finalBusinessName || !finalBusinessContext) {
        return res.status(400).json({
            error: 'Missing required fields: agent_name, company_name, and context (or business_name/context) are mandatory.'
        });
    }

    if (finalQuestions.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 questions allowed.' });
    }

    // --- Agent limit check ---
    const userLimit = req.user.agent_limit || 10;
    const isLifetime = req.user.is_lifetime === true;

    if (!isLifetime) {
        // Atomic agent count check + increment (respects per-user limit)
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc('increment_agent_count', { p_user_id: req.user.id, p_limit: userLimit });

        if (rpcError) {
            console.error('RPC error:', rpcError);
            if (rpcError.message && rpcError.message.includes('limit')) {
                return res.status(429).json({ error: `Agent creation limit reached (${userLimit}).` });
            }
            return res.status(500).json({ error: 'Internal error checking agent limit.' });
        }

        if (rpcResult === false) {
            return res.status(429).json({ error: `Agent creation limit reached (${userLimit}).` });
        }
    } else {
        // Lifetime user: still increment count for tracking, but no limit check
        await supabase
            .from('users')
            .update({ agent_count: (req.user.agent_count || 0) + 1 })
            .eq('id', req.user.id);
    }

    // --- Insert agent config ---
    const agentId = uuidv4();
    const ultravoxKey = req.headers['x-ultravox-key'] || null;

    const { error: insertError } = await supabase
        .from('agent_configs')
        .insert({
            id: agentId,
            user_id: req.user.id,
            business_name: finalBusinessName,
            business_context: finalBusinessContext,
            greeting: greeting || null,
            questions: finalQuestions,
            // Additional B2B tracking (optional columns)
            agent_name: agent_name || null,
            external_id: to || null,
            ultravox_api_key: ultravoxKey,
            webhook_url: webhook_url || null,
            voice_id: voice_id || null
        });

    if (insertError) {
        console.error('Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to save agent configuration.' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const sessionUrl = `${baseUrl}/voice-session/${agentId}`;

    res.json({
        id: agentId,
        session_url: sessionUrl
    });
});

export default router;
