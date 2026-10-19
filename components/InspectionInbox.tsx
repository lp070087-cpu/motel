'use client';
import {useState} from 'react';
import {useMotel} from '../lib/store';
import {money,type Role} from '../lib/domain';
import './OperationalIntegration.css';
export default function InspectionInbox({unitId,actorId,role,onSelectRoom}:{unitId:string;actorId:string;role:Role;onSelectRoom:(id:string)=>void}){
 const {state,dispatch}=useMotel();const [message,setMessage]=useState('');
 const inspections=state.operations?.inspections.filter(i=>i.unitId===unitId&&i.status!=='draft')??[];
 const unread=inspections.filter(i=>i.status==='submitted').length;
 return <section className="panel oi-inbox" aria-label="Inspeções e consumos recebidos"><header className="oi-inbox-heading"><div><span className="eyebrow">CAMAREIRAS / RECEPÇÃO</span><h3>Inspeções e consumos recebidos</h3></div><span role="status" aria-live="polite">{unread?unread+' nova(s) para conferir':'Tudo acompanhado'}</span></header>
  {!inspections.length&&<p className="muted">As inspeções concluídas nesta unidade aparecerão aqui.</p>}
  {inspections.map(inspection=><details key={inspection.id} className="oi-received"><summary><strong>Suíte {state.rooms.find(r=>r.id===inspection.roomId)?.number}</strong><span>{inspection.staffName}</span><span>{money(inspection.additionalTotal+inspection.reviewTotal)}</span><small>{inspection.status==='submitted'?'Nova inspeção':'Recebida'} · {inspection.billing==='review'?(inspection.reviewTotal>0&&!state.reviews.some(r=>r.inspectionId===inspection.id&&r.status==='pending')?'Revisão autorizada · cobrança separada':'Revisão necessária'):inspection.billing==='posted'?'Lançado na conta':'Sem adicional'}</small></summary>
   <p>{state.units.find(u=>u.id===inspection.unitId)?.name} · {new Date(inspection.completedAt!).toLocaleString('pt-BR')}</p>
   <div className="oi-table-wrap"><table><thead><tr><th>Produto</th><th>Consumido / restante</th><th>Preço</th><th>Adicional</th></tr></thead><tbody>{inspection.items.map(item=><tr key={item.productId}><td>{item.name}<small>{item.divergence?'Divergência · ':''}{item.note}</small></td><td>{item.consumed} / {item.remaining}<small>Previsto: {item.expected}{item.expected-item.consumed-item.remaining>0?' · Diferença não confirmada: '+(item.expected-item.consumed-item.remaining):item.consumed+item.remaining>item.expected?' · Saldo excedente: '+(item.consumed+item.remaining-item.expected):''}</small></td><td>{money(item.unitPrice)}</td><td>{item.additional} un. · {money(item.amount)}</td></tr>)}</tbody></table></div>
   <p>Na conta: <strong>{money(inspection.additionalTotal)}</strong> · Revisão de conta encerrada: <strong>{money(inspection.reviewTotal)}</strong></p>
   <div className="oi-actions"><button onClick={()=>onSelectRoom(inspection.roomId)}>Abrir conta da suíte</button>{inspection.status==='submitted'&&<button onClick={()=>{const result=dispatch({type:'RECEIVE_INSPECTION',inspectionId:inspection.id,actor:role,actorId,actorUnitId:unitId});setMessage(result.ok?'Recebimento registrado.':result.error??'Não foi possível receber.')}}>Marcar como recebida</button>}</div>
  </details>)}
  {message&&<p role="status">{message}</p>}
 </section>;
}
