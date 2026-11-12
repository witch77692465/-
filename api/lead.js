const crypto = require('node:crypto');
const recent = new Map();
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'허용되지 않는 요청입니다.'});
  try{
    const {phone,consent}=req.body||{};
    const digits=String(phone||'').replace(/[^0-9]/g,'');
    if(!/^01[016789][0-9]{7,8}$/.test(digits)||consent!==true)return res.status(400).json({error:'연락처와 개인정보 동의를 확인해 주세요.'});
    const {SOLAPI_API_KEY:key,SOLAPI_API_SECRET:secret,SOLAPI_SENDER:from,NOTIFY_PHONE:to}=process.env;
    if(!key||!secret||!from||!to)return res.status(503).json({error:'문자 알림 설정을 확인해 주세요.'});
    const salt=crypto.randomBytes(16).toString('hex');
    const date=new Date().toISOString();
    const signature=crypto.createHmac('sha256',secret).update(date+salt).digest('hex');
    const response=await fetch('https://api.solapi.com/messages/v4/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`},body:JSON.stringify({message:{to:String(to).replace(/[^0-9]/g,''),from:String(from).replace(/[^0-9]/g,''),text:`[구미 대광로제비앙] 방문예약 신청\n연락처: ${digits}\n개인정보 동의: 예`}})});
    if(!response.ok){console.error('Solapi error status:',response.status);return res.status(502).json({error:'문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.'});}
    return res.status(200).json({ok:true});
  }catch(err){console.error('Lead error:',err.message);return res.status(500).json({error:'일시적인 오류가 발생했습니다.'});}
};
