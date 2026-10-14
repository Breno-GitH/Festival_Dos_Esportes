// Local QA only. Exposes this workspace on loopback, never on the LAN.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const prefix = '/2025/Festival-dos-Esportes-main/';
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
    '.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg',
    '.mp3':'audio/mpeg','.wav':'audio/wav','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
    let name;
    try { name=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
    catch { res.writeHead(400);return res.end(); }
    if(!name.startsWith(prefix)){res.writeHead(404);return res.end();}
    const file=path.resolve(root,name.slice(prefix.length)||'index.html');
    if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
    fs.stat(file,(error,stat)=>{
        if(error||!stat.isFile()){res.writeHead(404);return res.end();}
        res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream',
            'Cache-Control':'no-store'});
        fs.createReadStream(file).pipe(res);
    });
}).listen(80,'127.0.0.1');
