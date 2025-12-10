exports.handler = async function(event){
  const key = event.queryStringParameters && event.queryStringParameters.key;
  if(!key) return { statusCode:403, body: JSON.stringify({ok:false})};
  if(key === process.env.ADMIN_SECRET) return { statusCode:200, body: JSON.stringify({ok:true})};
  return { statusCode:403, body: JSON.stringify({ok:false})};
}
