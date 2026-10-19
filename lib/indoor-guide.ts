import { architectureLayout } from './architecture';
import type { MotelState } from './domain';
import { resolveActiveStay } from './operational-domain';

export interface GuideNode {id:string;x:number;z:number;kind:'entrance'|'portaria'|'corridor'|'door'}
export interface GuideGraph {nodes:GuideNode[];edges:[string,string][]}
export function buildGuideGraph(unitId:string,roomCount:number):GuideGraph {
 const layout=architectureLayout(unitId,roomCount);
 const spine=layout.entrySide*(layout.width/2-.8);
 const galleries=layout.galleries;
 const nodes:GuideNode[]=[
  {id:'entrance',x:spine+layout.entrySide*3,z:galleries[0]??0,kind:'entrance'},
  {id:'portaria',x:spine+layout.entrySide*1.2,z:galleries[0]??0,kind:'portaria'},
 ];
 const edges:[string,string][]=[['entrance','portaria']];
 galleries.forEach((z,i)=>{
  nodes.push({id:'spine-'+i,x:spine,z,kind:'corridor'});
  edges.push(i===0?['portaria','spine-0']:['spine-'+(i-1),'spine-'+i]);
  // Gallery nodes are ordered from the side circulation toward the rooms.
  const xs=Array.from(new Set(layout.positions.filter((_,index)=>Math.floor(index/layout.columns/2)===i).map(p=>p[0]))).sort((a,b)=>layout.entrySide===-1?a-b:b-a);
  let previous='spine-'+i;
  xs.forEach((x,column)=>{
   const key='gallery-'+i+'-'+column;
   nodes.push({id:key,x,z,kind:'corridor'});edges.push([previous,key]);previous=key;
   layout.positions.forEach(([rx,,rz],index)=>{
    if(rx!==x||Math.floor(index/layout.columns/2)!==i)return;
    nodes.push({id:'door-'+index,x:rx,z:rz+(layout.mirrored[index]?-3.58:3.58),kind:'door'});
    edges.push([key,'door-'+index]);
   });
  });
 });
 return {nodes,edges};
}
export function shortestGuidePath(graph:GuideGraph,destination:string):GuideNode[] {
 const queue=['entrance'];const parents=new Map<string,string|null>([['entrance',null]]);
 while(queue.length){const current=queue.shift()!;if(current===destination)break;
  for(const edge of graph.edges){const next=edge[0]===current?edge[1]:edge[1]===current?edge[0]:null;
   if(next&&!parents.has(next)){parents.set(next,current);queue.push(next);}
  }
 }
 if(!parents.has(destination))throw new Error('Não há trajeto conectado para esta suíte.');
 const path:string[]=[];let at:string|null=destination;
 while(at){path.unshift(at);at=parents.get(at)??null;}
 return path.map(key=>graph.nodes.find(node=>node.id===key)!);
}
export function guestGuide(state:MotelState,roomId:string,token:string) {
 const stay=resolveActiveStay(state,roomId,token);
 const reservation=stay&&state.reservations.find(r=>r.roomId===roomId&&r.status==='checked_in'&&(stay.reservationId?r.id===stay.reservationId:r.end===stay.expectedOut));
 if(!stay||stay.source!=='online'||!reservation)throw new Error('Guia disponível somente para a reserva online com check-in ativo.');
 const room=state.rooms.find(r=>r.id===roomId)!;
 const rooms=state.rooms.filter(r=>r.unitId===room.unitId);
 const layout=architectureLayout(room.unitId,rooms.length);
 const graph=buildGuideGraph(room.unitId,rooms.length);
 return {room,rooms,layout,graph,path:shortestGuidePath(graph,'door-'+rooms.findIndex(r=>r.id===roomId))};
}
export function suiteEntryPath(roomId:string) {
 if(!/^u(?:[1-9]|10)-r(?:[1-9]|[1-5][0-9]|60)$/.test(roomId))throw new Error('Identificador de suíte inválido.');
 return '/suite/'+encodeURIComponent(roomId);
}
