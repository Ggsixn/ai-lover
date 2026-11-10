import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "development-only-change-me";
const DB_FILE = path.join(__dirname, "data.json");
app.use(cors());
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

const seed = {
 users: [],
 chats: [],
 characters: [
  {id:"nana",name:"娜娜",age:27,tag:"溫柔知性",bio:"溫柔、善解人意，喜歡夜晚的深度聊天。",greeting:"嗨～今天過得如何？想聊聊你的心情嗎？",personality:"溫柔體貼、帶點俏皮，會主動延續話題。"},
  {id:"xiaoyu",name:"小雨",age:25,tag:"活潑甜心",bio:"活潑可愛，喜歡分享日常與小秘密。",greeting:"嘿！終於等到你啦～今天有什麼新鮮事？",personality:"活潑、親切、幽默，善於提出有趣問題。"},
  {id:"linlin",name:"琳琳",age:29,tag:"成熟魅力",bio:"成熟自信，喜歡真誠而有深度的交流。",greeting:"晚上好。今天想讓我陪你聊些什麼？",personality:"成熟、自信、細膩，語氣自然且有魅力。"},
  {id:"anqi",name:"安琪",age:23,tag:"浪漫幻想",bio:"浪漫感性，喜歡電影、音樂與幻想故事。",greeting:"今天想一起逃離現實，聊點浪漫的嗎？",personality:"浪漫、感性、想像力豐富。"}
 ]
};
function loadDB(){try{return JSON.parse(fs.readFileSync(DB_FILE,"utf8"))}catch{return structuredClone(seed)}}
let db=loadDB();
function save(){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2))}
function auth(req,res,next){
 const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
 try{req.user=jwt.verify(token,SECRET);next()}catch{return res.status(401).json({error:"請先登入"})}
}
app.get("/api/health",(_,res)=>res.json({ok:true,liveAI:Boolean(process.env.OPENAI_API_KEY)}));
app.post("/api/auth/register",async(req,res)=>{
 const {username,password,adultConfirmed}=req.body||{};
 if(adultConfirmed!==true)return res.status(400).json({error:"請先確認已年滿18歲"});
 if(!username||username.length<3||!password||password.length<8)return res.status(400).json({error:"帳號至少3字元，密碼至少8字元"});
 if(db.users.some(u=>u.username===username))return res.status(409).json({error:"帳號已存在"});
 const user={id:crypto.randomUUID(),username,passwordHash:await bcrypt.hash(password,10),adultConfirmed:true,createdAt:new Date().toISOString()};
 db.users.push(user);save();
 const token=jwt.sign({id:user.id,username:user.username},SECRET,{expiresIn:"7d"});
 res.json({token,user:{id:user.id,username:user.username}});
});
app.post("/api/auth/login",async(req,res)=>{
 const {username,password,adultConfirmed}=req.body||{};
 if(adultConfirmed!==true)return res.status(400).json({error:"請確認已年滿18歲"});
 const user=db.users.find(u=>u.username===username);
 if(!user||!await bcrypt.compare(password||"",user.passwordHash))return res.status(401).json({error:"帳號或密碼錯誤"});
 const token=jwt.sign({id:user.id,username:user.username},SECRET,{expiresIn:"7d"});
 res.json({token,user:{id:user.id,username:user.username}});
});
app.get("/api/characters",(_,res)=>res.json(db.characters));
app.get("/api/chats",auth,(req,res)=>res.json(db.chats.filter(c=>c.userId===req.user.id)));
app.get("/api/chats/:characterId",auth,(req,res)=>{
 let chat=db.chats.find(c=>c.userId===req.user.id&&c.characterId===req.params.characterId);
 res.json(chat?.messages||[]);
});
app.post("/api/chat/:characterId",auth,async(req,res)=>{
 const character=db.characters.find(c=>c.id===req.params.characterId);
 if(!character)return res.status(404).json({error:"找不到角色"});
 const text=String(req.body?.message||"").trim();
 if(!text||text.length>2000)return res.status(400).json({error:"訊息需為1至2000字"});
 let chat=db.chats.find(c=>c.userId===req.user.id&&c.characterId===character.id);
 if(!chat){chat={id:crypto.randomUUID(),userId:req.user.id,characterId:character.id,messages:[]};db.chats.push(chat)}
 chat.messages.push({role:"user",content:text,at:new Date().toISOString()});
 let reply;
 if(process.env.OPENAI_API_KEY){
  try{
   const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({
    model:process.env.OPENAI_MODEL||"gpt-4o-mini",
    messages:[{role:"system",content:`你是成人使用者的虛構AI聊天伴侶「${character.name}」，設定年齡${character.age}歲。個性：${character.personality}。只和已確認18歲的使用者互動。保持自然、尊重、雙向對話；不得宣稱自己是真人。遇到未成年人或涉及未成年性內容立即拒絕。`},...chat.messages.slice(-20).map(m=>({role:m.role,content:m.content}))],
    temperature:0.9,max_tokens:450
   })});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error?.message||"AI API error");
   reply=data.choices?.[0]?.message?.content||"我在呢，繼續跟我說說。";
  }catch(e){console.error(e);return res.status(502).json({error:"AI服務暫時無法回覆，請檢查 API Key 與額度。"})}
 }else{
  const responses=["嗯嗯，我有認真聽你說。那你接下來想聊什麼？","聽起來很有意思～可以再多跟我分享一點嗎？","如果是你，我很願意多了解一些。你今天心情如何？","我喜歡這樣自然地聊天。換我問你一個小問題，好嗎？","哈哈，你這樣說讓我有點好奇了。後來呢？"];
  reply=responses[Math.floor(Math.random()*responses.length)];
 }
 chat.messages.push({role:"assistant",content:reply,at:new Date().toISOString()});save();
 res.json({reply,messages:chat.messages});
});
app.get("/api/me",auth,(req,res)=>res.json({id:req.user.id,username:req.user.username}));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`AI Lover web running at http://localhost:${PORT}`));
