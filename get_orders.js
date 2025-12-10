const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async function(event) {
  const user_id = event.queryStringParameters && event.queryStringParameters.user_id;
  try {
    let q = supabase.from('orders').select('*').order('created_at',{ascending:false});
    if(user_id) q = q.eq('user_id', user_id);
    const { data, error } = await q;
    if(error) return { statusCode:500, body: JSON.stringify({error: error.message})};
    return { statusCode:200, body: JSON.stringify(data) };
  } catch(e){
    return { statusCode:500, body: JSON.stringify({error: e.message})};
  }
};
