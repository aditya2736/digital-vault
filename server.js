import express from "express";
import session from "express-session";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const PORT=process.env.PORT||3000;
const ADMIN_USER=process.env.ADMIN_USER||"admin";
const ADMIN_PASS=process.env.ADMIN_PASS||"change-me-now";

const dataDir=path.join(__dirname,"data");
const uploadDir=path.join(__dirname,"uploads");
fs.mkdirSync(dataDir,{recursive:true}); fs.mkdirSync(uploadDir,{recursive:true});
const dbFile=path.join(dataDir,"store.json");
if(!fs.existsSync(dbFile)) fs.writeFileSync(dbFile,JSON.stringify({products:[],orders:[]},null,2));

const readDB=()=>JSON.parse(fs.readFileSync(dbFile,"utf8"));
const writeDB=db=>fs.writeFileSync(dbFile,JSON.stringify(db,null,2));
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const auth=(req,res,next)=>req.session.admin?next():res.status(401).json({error:"Admin login required"});
const upload=multer({dest:uploadDir,limits:{fileSize:100*1024*1024}});

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.use("/files",express.static(uploadDir,{fallthrough:false}));
app.use(session({secret:process.env.SESSION_SECRET||"replace-this-secret",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));

app.get("/api/products",(req,res)=>{
  const db=readDB();
  res.json(db.products.map(p=>({...p, fileName:undefined})));
});
app.get("/api/products/:id",(req,res)=>{
  const p=readDB().products.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).json({error:"Product not found"});
  res.json({...p,fileName:undefined});
});
app.post("/api/orders",(req,res)=>{
  const {productId,email,name}=req.body;
  const db=readDB(), p=db.products.find(x=>x.id===productId);
  if(!p) return res.status(404).json({error:"Product not found"});
  if(!email) return res.status(400).json({error:"Email required"});
  const order={id:"ORD-"+Date.now(),productId,email,name:name||"",amount:p.price,status:"pending",createdAt:new Date().toISOString()};
  db.orders.unshift(order); writeDB(db);
  res.json({orderId:order.id,message:"Order created. Payment integration is required before marking it paid."});
});

app.post("/api/admin/login",(req,res)=>{
  if(req.body.username===ADMIN_USER && req.body.password===ADMIN_PASS){req.session.admin=true; return res.json({ok:true});}
  res.status(401).json({error:"Invalid credentials"});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({authenticated:!!req.session.admin}));
app.get("/api/admin/orders",auth,(req,res)=>res.json(readDB().orders));

app.post("/api/admin/products",auth,upload.single("file"),(req,res)=>{
  const {name,description,price,category,featured}=req.body;
  if(!name||!price) return res.status(400).json({error:"Name and price required"});
  if(!req.file) return res.status(400).json({error:"Digital product file required"});
  const db=readDB();
  const product={id:Date.now().toString(),name,slug:slug(name)+"-"+Date.now(),description:description||"",price:Number(price),category:category||"Digital",featured:featured==="true",file:req.file.filename,fileOriginalName:req.file.originalname,createdAt:new Date().toISOString()};
  db.products.unshift(product); writeDB(db);
  res.json({...product,file:undefined});
});
app.delete("/api/admin/products/:id",auth,(req,res)=>{
  const db=readDB(), i=db.products.findIndex(x=>x.id===req.params.id);
  if(i<0) return res.status(404).json({error:"Not found"});
  const p=db.products[i]; try{fs.unlinkSync(path.join(uploadDir,p.file))}catch{}
  db.products.splice(i,1); writeDB(db); res.json({ok:true});
});
app.post("/api/admin/orders/:id/paid",auth,(req,res)=>{
  const db=readDB(),o=db.orders.find(x=>x.id===req.params.id);
  if(!o)return res.status(404).json({error:"Order not found"});
  o.status="paid";o.paidAt=new Date().toISOString();writeDB(db);res.json(o);
});
app.get("/api/download/:orderId",(req,res)=>{
  const db=readDB(),o=db.orders.find(x=>x.id===req.params.orderId);
  if(!o||o.status!=="paid")return res.status(403).send("Payment not confirmed.");
  const p=db.products.find(x=>x.id===o.productId);
  if(!p||!fs.existsSync(path.join(uploadDir,p.file)))return res.status(404).send("File unavailable.");
  res.download(path.join(uploadDir,p.file),p.fileOriginalName);
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Store running at http://localhost:${PORT}`));