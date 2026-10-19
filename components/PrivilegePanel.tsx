'use client';
import {useEffect,useState} from 'react';
import {useMotel} from '../lib/store';
import {money} from '../lib/domain';
import {accountView} from '../lib/operational-domain';
import {demoCredentialDigest} from '../lib/services/guest-access';
import './OperationalIntegration.css';

export default function PrivilegePanel({stay,onClose}:{stay?:{id:string;token:string};onClose:()=>void}){
 const {state,dispatch}=useMotel();const [mode,setMode]=useState<'signin'|'register'>('signin');
 const [accessToken,setAccessToken]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{try{setAccessToken(sessionStorage.getItem('motel-privilege-access')??'')}catch{}},[]);
 const view=accountView(state,accessToken);
 const linked=!!view&&!!stay&&state.stays.find(s=>s.id===stay.id)?.accountId===view.account.id;
 async function authenticate(form:HTMLFormElement){
  const data=new FormData(form);setBusy(true);setMessage('');
  try{
   const email=String(data.get('email')),credentialDigest=await demoCredentialDigest(email,String(data.get('code')));
   const token=crypto.randomUUID();
   const action=mode==='register'?{type:'REGISTER_GUEST_ACCOUNT' as const,name:String(data.get('name')),email,credentialDigest,accessToken:token}:{type:'SIGN_IN_GUEST_ACCOUNT' as const,email,credentialDigest,accessToken:token};
   const result=dispatch({...action,actor:'guest'});if(!result.ok)throw new Error(result.error);
   setAccessToken(token);try{sessionStorage.setItem('motel-privilege-access',token)}catch{}
   if(stay){const link=dispatch({type:'LINK_GUEST_ACCOUNT',stayId:stay.id,token:stay.token,accessToken:token,actor:'guest'});setMessage(link.ok?'Cadastro vinculado. Pontos serão calculados somente após o pagamento elegível.':link.error??'Não foi possível vincular.');}
   else setMessage('Acesso ao cadastro demonstrativo confirmado.');
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível acessar.')}finally{setBusy(false)}
 }
 return <section className="oi-privilege" aria-label="MOTEL Privilege"><header className="oi-inbox-heading"><div><span className="eyebrow">SEUS MOMENTOS, RECONHECIDOS</span><h2>MOTEL Privilege</h2></div><button onClick={onClose}>Fechar</button></header>
 <p className="oi-muted">Programa demonstrativo local. Cadastro opcional, sem valor financeiro real e sem sincronização entre dispositivos.</p>
 {!view?<><div className="oi-operation-tabs"><button aria-pressed={mode==='signin'} onClick={()=>setMode('signin')}>Entrar</button><button aria-pressed={mode==='register'} onClick={()=>setMode('register')}>Criar minha conta</button></div>
 <form className="oi-form" onSubmit={e=>{e.preventDefault();void authenticate(e.currentTarget)}}>
  {mode==='register'&&<label>Nome demonstrativo<input name="name" required minLength={2} maxLength={80} autoComplete="off"/></label>}
  <label>E-mail demonstrativo<input type="email" name="email" required maxLength={160} autoComplete="off"/></label>
  <label>Código pessoal demonstrativo<input type="password" name="code" required minLength={6} maxLength={80} autoComplete="off"/></label>
  <small>Use dados fictícios e um código exclusivo para esta demonstração.</small>
  <button type="submit" disabled={busy}>{busy?'Aguarde…':mode==='register'?'Criar cadastro demonstrativo':'Entrar na minha conta'}</button>
 </form></>:<>
  <div className="oi-points"><span>Olá, {view.account.name}</span><strong>{view.balance} <small>pontos</small></strong><p>1 ponto a cada {money(view.rules.brlPerPoint)} elegíveis pagos. {view.rules.includeConsumption?'Consumos confirmados incluídos.':'Apenas a tarifa elegível.'}</p></div>
  {stay&&!linked&&<button onClick={()=>{const result=dispatch({type:'LINK_GUEST_ACCOUNT',stayId:stay.id,token:stay.token,accessToken,actor:'guest'});setMessage(result.ok?'Hospedagem vinculada para acúmulo após o pagamento.':result.error??'Não foi possível vincular.')}}>Vincular minha hospedagem atual</button>}
  {linked&&<p className="oi-message">Hospedagem vinculada. Nenhum ponto é antecipado antes do pagamento.</p>}
  <h3>Benefícios demonstrativos</h3><div className="oi-benefits">{view.rules.benefits.map(benefit=><article key={benefit.id}><strong>{benefit.name}</strong><span>{benefit.cost} pontos</span><button disabled={view.balance<benefit.cost} onClick={()=>{const result=dispatch({type:'REDEEM_PRIVILEGE',accessToken,benefitId:benefit.id,requestId:crypto.randomUUID(),actor:'guest'});setMessage(result.ok?'Resgate simulado registrado. Nenhum pagamento ou desconto real foi gerado.':result.error??'Não foi possível resgatar.')}}>Resgatar na demonstração</button></article>)}</div>
  <h3>Histórico de pontos</h3>{!view.entries.length&&<p className="oi-muted">Nenhum ponto creditado. O acúmulo ocorre após o pagamento de uma hospedagem vinculada.</p>}{view.entries.slice().reverse().map(entry=><p key={entry.id} className="oi-ledger"><span>{entry.description}<small>{new Date(entry.createdAt).toLocaleString('pt-BR')}</small></span><strong>{entry.points>0?'+':''}{entry.points}</strong></p>)}
  <h3>Minhas hospedagens elegíveis</h3>{!view.stays.length&&<p className="oi-muted">Nenhuma hospedagem encerrada vinculada ao cadastro.</p>}{view.stays.map(history=><p key={history.id} className="oi-ledger"><span>{state.units.find(u=>u.id===state.rooms.find(r=>r.id===history.roomId)?.unitId)?.name} · suíte {state.rooms.find(r=>r.id===history.roomId)?.number}<small>{new Date(history.checkIn).toLocaleDateString('pt-BR')}</small></span><strong>{money(history.paid)}</strong></p>)}
  <button onClick={()=>{dispatch({type:'SIGN_OUT_GUEST_ACCOUNT',accessToken,actor:'guest'});setAccessToken('');try{sessionStorage.removeItem('motel-privilege-access')}catch{}setMessage('Acesso ao cadastro encerrado.')}}>Sair do cadastro</button>
 </>}
 {message&&<p role="status" className="oi-message">{message}</p>}
 </section>;
}
