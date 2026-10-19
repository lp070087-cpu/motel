'use client';
import {useMotel} from '../lib/store';
import {guestGuide} from '../lib/indoor-guide';
import './OperationalIntegration.css';
export default function IndoorGuide({roomId,token,onClose}:{roomId:string;token:string;onClose:()=>void}){
 const {state}=useMotel();let guide;
 try{guide=guestGuide(state,roomId,token);}catch{return <section className="oi-guide"><p>O guia exige reserva online com check-in e sessão ativos.</p><button onClick={onClose}>Voltar</button></section>;}
 const {layout,rooms,room,graph,path}=guide;
 const pad=7;const minX=-layout.width/2-pad,minZ=-layout.depth/2-pad;
 const destinationIndex=rooms.findIndex(r=>r.id===roomId);const galleryNumber=Math.floor(destinationIndex/layout.columns/2)+1;
 const pathPoints=path.map(p=>p.x+','+p.z).join(' ');
 return <section className="oi-guide" aria-label={'Guia ilustrativo até a suíte '+room.number}><header className="oi-inbox-heading"><div><span className="eyebrow">COMO CHEGAR À MINHA SUÍTE</span><h2>Seu caminho até a suíte {room.number}</h2><p>{state.units.find(u=>u.id===room.unitId)?.name}</p></div><button onClick={onClose}>Voltar</button></header>
  <p className="oi-muted">Planta ilustrativa desta unidade fictícia. O percurso segue corredores e acessos conectados; não utiliza GPS ou localização interna real.</p>
  <svg viewBox={[minX,minZ,layout.width+pad*2,layout.depth+pad*2].join(' ')} role="img" aria-label={'Entrada, portaria e percurso pelos corredores até a suíte '+room.number}>
   <defs><marker id="guide-arrow" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#9b7841"/></marker></defs>
   {graph.edges.map(([a,b])=>{const start=graph.nodes.find(n=>n.id===a)!,end=graph.nodes.find(n=>n.id===b)!;return <line key={a+b} x1={start.x} y1={start.z} x2={end.x} y2={end.z} stroke="#d4cbb9" strokeWidth="1.7"/>})}
   {rooms.map((r,index)=>{const [x,,z]=layout.positions[index];return <g key={r.id}><rect x={x-2.35} y={z-3.45} width="4.7" height="6.9" rx=".3" fill={r.id===roomId?'#d6b98a':'#f4f0e8'} stroke={r.id===roomId?'#92713c':'#c1b7a5'} strokeWidth=".15"/>{r.id===roomId&&r.amenities.includes('Garagem privativa')&&<g><rect x={x-.8} y={z+1.25} width="1.6" height="1.4" rx=".15" fill="#f5eddc" stroke="#92713c" strokeWidth=".1"/><text x={x} y={z+2.25} textAnchor="middle" fontSize="1" fill="#65512f">G</text></g>}<text x={x} y={z+.3} textAnchor="middle" fill="#403a30" fontSize="1.1" fontWeight={r.id===roomId?'700':'400'}>{r.number}</text></g>})}
   <polyline points={pathPoints} fill="none" stroke="#9b7841" strokeWidth=".48" strokeLinejoin="round" markerEnd="url(#guide-arrow)"/>
   <circle cx={path[0].x} cy={path[0].z} r=".65" fill="#536d4b"/>
   <text x={path[0].x} y={path[0].z-1.5} textAnchor="middle" fontSize="1.15" fill="#35432e">Entrada</text>
   <text x={path[1].x} y={path[1].z+2.5} textAnchor="middle" fontSize="1" fill="#65583f">Portaria</text>
   <circle cx={path[path.length-1].x} cy={path[path.length-1].z} r=".65" fill="#9b7841"/>
  </svg>
  <ol className="oi-guide-steps"><li>Entre pela portaria indicada.</li><li>Siga a circulação lateral até a {galleryNumber}ª galeria destacada.</li><li>Procure a identificação <strong>{room.number}</strong> e o acesso marcado.</li></ol>
  {room.amenities.includes('Garagem privativa')&&<p className="oi-message">G · Garagem privativa demonstrativa: acesso associado à sua suíte. A orientação real depende da planta fornecida pelo estabelecimento.</p>}
 </section>;
}
