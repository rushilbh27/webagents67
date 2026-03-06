// Creates a test user and API key for development
import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEST_API_KEY = 'va_test_' + crypto.randomBytes(16).toString('hex');
const keyHash = crypto.createHash('sha256').update(TEST_API_KEY).digest('hex');
const keyPreview = TEST_API_KEY.slice(-8);

async function setup() {
    // 1. Create test user
    const { data: user, error: userErr } = await supabase
        .from('users')
        .insert({ email: 'test@voiceagent.dev', is_active: true, agent_count: 0 })
        .select()
        .single();

    if (userErr) {
        console.error('User creation error:', userErr.message);
        // Maybe user already exists, try to fetch
        const { data: existing } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'test@voiceagent.dev')
            .single();
        if (existing) {
            console.log('User already exists:', existing.id);
            // Still create the API key
            const { error: keyErr } = await supabase
                .from('api_keys')
                .insert({ user_id: existing.id, key_hash: keyHash, key_preview: keyPreview });
            if (keyErr) {
                console.error('Key creation error:', keyErr.message);
                process.exit(1);
            }
            console.log('\n========================================');
            console.log('YOUR TEST API KEY (save this, shown once):');
            console.log(TEST_API_KEY);
            console.log('========================================\n');
            process.exit(0);
        }
        process.exit(1);
    }

    console.log('Created user:', user.id);

    // 2. Create API key
    const { error: keyErr } = await supabase
        .from('api_keys')
        .insert({ user_id: user.id, key_hash: keyHash, key_preview: keyPreview });

    if (keyErr) {
        console.error('Key creation error:', keyErr.message);
        process.exit(1);
    }

    console.log('\n========================================');
    console.log('YOUR TEST API KEY (save this, shown once):');
    console.log(TEST_API_KEY);
    console.log('========================================\n');
}

setup();
