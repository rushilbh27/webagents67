import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function bootstrapAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL;
    // Use a temporary password from args or a default
    const password = process.argv[2] || 'AdminPass123!';

    if (!adminEmail) {
        console.error('❌ Error: ADMIN_EMAIL not found in .env');
        process.exit(1);
    }

    console.log(`🚀 Bootstrapping Admin for: ${adminEmail}`);

    // 1. Check if user exists in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('❌ Error listing users:', listError);
        process.exit(1);
    }

    const existingAuthUser = users.find(u => u.email === adminEmail);

    let userId;

    if (existingAuthUser) {
        console.log('🔄 User already exists in auth.users, updating password...');
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
            existingAuthUser.id,
            { password, email_confirm: true }
        );
        if (updateError) {
            console.error('❌ Error updating password:', updateError);
            process.exit(1);
        }
        userId = existingAuthUser.id;
        console.log('✅ Password updated successfully!');
    } else {
        console.log('✨ User doesn\'t exist, creating in auth.users...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: password,
            email_confirm: true
        });
        if (createError) {
            console.error('❌ Error creating user:', createError);
            process.exit(1);
        }
        userId = newUser.user.id;
        console.log('✅ User created successfully!');
    }

    // 2. Ensure user exists in public.users table (trigger might have done it, but let's be sure)
    const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (publicError || !publicUser) {
        console.log('🔌 Trigger hasn\'t fired or public.users record missing, inserting now...');
        const { error: insertError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: adminEmail,
                is_active: true, // Admin is always active
                agent_count: 0
            });
        if (insertError) {
            console.error('❌ Error inserting into public.users:', insertError);
            process.exit(1);
        }
        console.log('✅ public.users record ensured and activated!');
    } else {
        // If they exist but aren't active, activate them
        if (!publicUser.is_active) {
            await supabase.from('users').update({ is_active: true }).eq('id', userId);
            console.log('✅ public.users record was found and now activated!');
        } else {
            console.log('ℹ️ public.users record already exists and is active.');
        }
    }

    console.log('\n--- ADMIN CREATED ---');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${password}`);
    console.log('---------------------');
    console.log('Use these credentials to log in at /auth.');
}

bootstrapAdmin();
