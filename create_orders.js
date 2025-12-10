const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const stripe = require('stripe')(process.env.STRIPE_SECRET);

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { items, shipping_address, phone, payment_method } = body;
    if(!items || !items.length) return { statusCode:400, body: JSON.stringify({error:'items required'})};

    // calculate total from DB (prevent client price tampering)
    let total = 0;
    for(const it of items){
      const { data:product, error } = await supabase.from('products').select('*').eq('id', it.product_id).single();
      if(error) return { statusCode:500, body: JSON.stringify({error:error.message})};
      total += Number(product.price) * Number(it.qty);
    }

    // create order
    const { data:order } = await supabase.from('orders').insert([{ user_id: null, status: payment_method==='cod' ? 'pending':'pending', total, shipping_address, phone, payment_method }]).single();

    // insert order_items
    for(const it of items){
      const { data:product } = await supabase.from('products').select('*').eq('id', it.product_id).single();
      await supabase.from('order_items').insert([{ order_id: order.id, product_id: product.id, qty: it.qty, unit_price: product.price }]);
      // update monthly_sales (simple upsert)
      const month = new Date().toISOString().slice(0,7);
      const keyId = `${month}_${product.id}`;
      // simplistic approach: increment table
      const { data:ms } = await supabase.from('monthly_sales').upsert([{ month, product_id: product.id, sold: it.qty }], { onConflict: ['month', 'product_id']});
    }

    // If payment method is stripe create checkout
    if(payment_method === 'stripe'){
      const line_items = items.map(it => ({ price_data:{currency:'php', product_data:{name:'Order item'}, unit_amount: Math.round(total*100)}, quantity:1 }));
      // In production create proper line items. Here we redirect to Stripe Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `${process.env.SITE_URL || 'https://your-site.netlify.app'}/?success=1`,
        cancel_url: `${process.env.SITE_URL || 'https://your-site.netlify.app'}/?cancel=1`,
        line_items: [{
          price_data: {
            currency: 'php',
            product_data: { name: 'Five Queens Order' },
            unit_amount: Math.round(total*100)
          },
          quantity: 1
        }]
      });
      // record payment placeholder
      await supabase.from('payments').insert([{ order_id: order.id, provider: 'stripe', provider_ref: session.id, amount: total, status: 'created' }]);
      return { statusCode:200, body: JSON.stringify({ checkout_url: session.url })};
    }

    // For cod / gcash / paypal (if you have server integration), return order id
    return { statusCode:200, body: JSON.stringify({ order_id: order.id }) };

  } catch (err) {
    return { statusCode:500, body: JSON.stringify({ error: err.message }) };
  }
};
