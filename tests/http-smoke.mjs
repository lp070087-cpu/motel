import {readdir} from 'node:fs/promises';
const base=process.env.MOTEL_BASE_URL??'http://localhost:3001';
const paths=[];
async function walk(dir,prefix=''){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.isDirectory())await walk(new URL(entry.name+'/',dir),prefix+entry.name+'/');
  else if(/\.(jpg|jpeg|png|webp|avif|svg)$/i.test(entry.name))paths.push('/'+prefix+entry.name);
 }
}
await walk(new URL('../public/',import.meta.url));
const failed=[];
const page=await fetch(base);if(!page.ok)failed.push({path:'/',status:page.status});await page.arrayBuffer();
const missing=await fetch(base+'/__motel_missing_check');if(missing.status!==404)failed.push({path:'404',status:missing.status});await missing.arrayBuffer();
for(let i=0;i<paths.length;i+=4)await Promise.all(paths.slice(i,i+4).map(async(path)=>{
 const response=await fetch(base+path.split('/').map(encodeURIComponent).join('/'));
 if(!response.ok)failed.push({path,status:response.status});
 await response.arrayBuffer();
}));
for(const src of ['/editorial/interior-8092426.jpg','/images/OIP (3).jpg']){
 const path='/_next/image?url='+encodeURIComponent(src)+'&w=640&q=85';
 const response=await fetch(base+path,{headers:{Accept:'image/webp'}});
 if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))failed.push({path,status:response.status});
 await response.arrayBuffer();
}
console.log(JSON.stringify({page:page.status,missingRoute:missing.status,images:paths.length,optimizedImages:2,failures:failed}));
if(failed.length)process.exitCode=1;
