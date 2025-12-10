const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async function(event){
  const month = (event.queryStringParameters && event.queryStringParameters.month) || new Date().toISOString().slice(0,7);
  // require admin key
  const key = event.queryStringParameters && event.queryStringParameters.admin_key;
  if(key !== process.env.ADMIN_SECRET) return { statusCode:403, body: JSON.stringify({error:'forbidden'}) };
  const { data, error } = await supabase.from('monthly_sales').select('*').eq('month', month).order('sold', { ascending:false });
  if(error) return { statusCode:500, body: JSON.stringify({error:error.message})};
  // join products
  const joined = [];
  for(const row of data){
    const { data:prod } = await supabase.from('products').select('*').eq('id', row.product_id).single();
    joined.push({ product: prod, sold: row.sold });
  }
  return { statusCode:200, body: JSON.stringify(joined) };
}
