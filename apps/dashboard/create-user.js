import { createClient } from '@supabase/supabase-js';

const url = 'https://dszqfebwbitraphxrykf.supabase.co';
const key = 'sb_publishable_6E3X9hiX8BFsoK1QV34Pxw_YFiwaOqs';
const supabase = createClient(url, key);

async function main() {
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@lsts.tech',
        password: 'Admin123!',
    });
    console.log("Signup data:", JSON.stringify(data, null, 2));
    if (error) {
        console.log("Signup error:", error.message);
    }
}

main();
