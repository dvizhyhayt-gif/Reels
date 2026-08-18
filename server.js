const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,port=process.env.PORT||3000;
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};

http.createServer((req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host}`);
  const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.join(root,path.normalize(requested).replace(/^(\.\.[/\\])+/,''));
  if(!file.startsWith(root)){res.writeHead(403);return res.end()}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);
  });
}).listen(port,()=>console.log(`AYUVERSE: http://localhost:${port}`));
