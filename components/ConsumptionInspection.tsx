'use client';
import {useEffect,useState} from 'react';
import {useMotel} from '../lib/store';
import {money,type Role} from '../lib/domain';
import type {InspectionInput} from '../lib/operational-domain';
import './OperationalIntegration.css';

export default function ConsumptionInspection({roomId,unitId,actorId,role}:{roomId:string;unitId:string;actorId:string;role:Role}) {
 const {state,dispatch}=useMotel();
 const [inputs,setInputs]=useState<Record<string,InspectionInput>>({});
 const [message,setMessage]=useState('');
 const room=state.rooms.find(r=>r.id===roomId&&r.unitId===unitId);
 const inspection=state.operations?.inspections.find(i=>i.roomId===roomId&&i.status==='draft'&&(i.staffId===actorId||role==='manager'||role==='owner'));
 const history=state.operations?.inspections.filter(i=>i.roomId===roomId&&i.status!=='draft')??[];
 function start(){const result=dispatch({type:'START_CONSUMPTION_INSPECTION',roomId,actor:role,actorId,actorUnitId:unitId});setMessage(result.ok?'Inspeção iniciada. Confira cada item antes de enviar.':result.error??'Não foi possível iniciar.');setInputs({});}
 useEffect(()=>{setInputs({});},[inspection?.id]);
 if(!room)return null;
 const value=(productId:string)=>inputs[productId]??inspection!.items.find(i=>i.productId===productId)!;
 const update=(productId:string,patch:Partial<InspectionInput>)=>setInputs(previous=>({...previous,[productId]:{...value(productId),...patch}}));
 const additional=inspection?.items.reduce((total,item)=>{
  const row=value(item.productId);const stay=state.stays.find(s=>s.id===inspection.stayId)!;
  const known=state.orders.filter(o=>o.stayId===stay.id&&o.productId===item.productId&&o.status==='confirmed').reduce((n,o)=>n+o.quantity,0)+(stay.reconciled[item.productId]??0)+state.reviews.filter(r=>r.stayId===stay.id&&r.productId===item.productId&&r.status==='pending').reduce((n,r)=>n+r.quantity,0);
  return total+Math.max(0,row.consumed-known)*item.unitPrice;
 },0)??0;
 return <section className="oi-inspection" aria-label={'Inspeção de consumo da suíte '+room.number}>
  <header><div><span className="eyebrow">CONFERÊNCIA DE CONSUMO</span><h2>Suíte {room.number} — Inspeção</h2><p>{room.category} · {state.units.find(u=>u.id===unitId)?.name}</p></div></header>
  <p className="oi-muted">Confira as quantidades físicas. OK marca o item como verificado, sem criar consumo. Valores são definidos pelo catálogo da unidade.</p>
  {!inspection?<button className="hk-primary" onClick={start}>Iniciar inspeção</button>:<>
   <p className="oi-muted">Responsável: {inspection.staffName} · Início: {new Date(inspection.startedAt).toLocaleString('pt-BR')}</p>
   <div className="oi-items">{inspection.items.map(item=>{const row=value(item.productId);return <article key={item.productId} className="oi-item">
    <div className="oi-item-title"><strong>{item.name}</strong><span>{money(item.unitPrice)} / un.</span><small>Quantidade prevista: {item.expected}</small></div>
    <div className="oi-quantities"><label>Consumido<input type="number" inputMode="numeric" aria-label={'Quantidade consumida de '+item.name} min="0" max={item.expected} step="1" value={row.consumed} onChange={e=>{const n=Number(e.target.value);update(item.productId,{consumed:n,remaining:row.divergence?row.remaining:Math.max(0,item.expected-n),checked:false})}}/></label>
    <label>Restante<input type="number" inputMode="numeric" aria-label={'Quantidade restante de '+item.name} min="0" max={row.divergence?10000:item.expected} step="1" value={row.remaining} onChange={e=>{const n=Number(e.target.value);update(item.productId,{remaining:n,consumed:row.divergence?row.consumed:Math.max(0,item.expected-n),checked:false})}}/></label></div>
    <div className="oi-checks"><label><input type="checkbox" checked={row.checked} onChange={e=>update(item.productId,{checked:e.target.checked})}/> Conferido</label>
    <button type="button" onClick={()=>update(item.productId,{checked:true,consumed:0,remaining:item.expected,divergence:false,note:''})}>OK · sem consumo</button>
    <label><input type="checkbox" checked={row.divergence} onChange={e=>update(item.productId,{divergence:e.target.checked})}/> Informar divergência</label></div>
    <label className="oi-note">Observação {row.divergence?'· obrigatória':'· opcional'}<textarea maxLength={500} value={row.note} onChange={e=>update(item.productId,{note:e.target.value})} placeholder="Diferença de quantidade, embalagem ou outra ocorrência"/></label>
   </article>})}</div>
   <div className="oi-summary"><span>Adicional encontrado, descontados lançamentos anteriores</span><strong>{money(additional)}</strong></div>
   <p className="oi-muted">{state.stays.find(s=>s.id===inspection.stayId)?.status==='closed'?'Conta encerrada: diferenças serão enviadas para revisão autorizada.':'Conta aberta: consumos conferidos serão incluídos uma única vez.'}</p>
   <button className="hk-primary" disabled={inspection.items.some(i=>!value(i.productId).checked)} onClick={()=>{
    const result=dispatch({type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:inspection.items.map(item=>{const row=value(item.productId);return {productId:item.productId,checked:row.checked,consumed:row.consumed,remaining:row.remaining,divergence:row.divergence,note:row.note}}),actor:role,actorId,actorUnitId:unitId});
    setMessage(result.ok?'Inspeção enviada à recepção. A conta foi atualizada quando permitido.':result.error??'Não foi possível concluir.');
   }}>Finalizar inspeção e enviar à recepção</button>
  </>}
  {message&&<p role="status" className="oi-message">{message}</p>}
  {!!history.length&&<details className="oi-history"><summary>Inspeções enviadas · {history.length}</summary>{history.slice(0,6).map(i=><p key={i.id}>{new Date(i.completedAt!).toLocaleString('pt-BR')} · {i.staffName} · {money(i.additionalTotal)} na conta · {money(i.reviewTotal)} em revisão</p>)}</details>}
 </section>;
}
