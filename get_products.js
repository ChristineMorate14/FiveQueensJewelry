const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async function(event) {
  try {
    const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
    const cat = (event.queryStringParameters && event.queryStringParameters.cat) || 'all';
    let query = supabase.from('products').select('*');
    if(cat && cat !== 'all') query = query.eq('category', cat);
    if(q) query = query.ilike('title', `%${q}%`).or(`description.ilike.%${q}%`);
    const { data, error } = await query.order('created_at', {ascending:false}).limit(100);
    if(error) return { statusCode: 500, body: JSON.stringify({error: error.message})};
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({error: err.message}) };
  }
};
