// 縦スライス配信サーバ（依存ゼロ）。ESM＋GLTFは http が要るためこれで開く。 → http://localhost:8090/straight-duel.html
const http=require("http"), fs=require("fs"), path=require("path");
const root=path.join(__dirname,"..","slice"), port=process.env.PORT||8090;
const mime={".html":"text/html;charset=utf-8",".js":"text/javascript",".mjs":"text/javascript",".glb":"model/gltf-binary",
  ".gltf":"model/gltf+json",".png":"image/png",".jpg":"image/jpeg",".json":"application/json",".css":"text/css"};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/straight-duel.html";
  const fp=path.join(root,p);
  fs.readFile(fp,(e,d)=>{ if(e){res.writeHead(404,{"Content-Type":"text/plain"});res.end("404 "+p);return;}
    res.writeHead(200,{"Content-Type":mime[path.extname(fp)]||"application/octet-stream","Cache-Control":"no-cache","Access-Control-Allow-Origin":"*"});
    res.end(d); });
}).listen(port,()=>console.log("SLICE on http://localhost:"+port+"/straight-duel.html"));
