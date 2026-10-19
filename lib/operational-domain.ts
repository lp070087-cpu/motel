import type { MotelState, Role } from './domain';

export interface InspectionItem {
 productId:string; name:string; expected:number; unitPrice:number;
 checked:boolean; consumed:number; remaining:number; divergence:boolean; note:string;
 additional:number; amount:number;
}
export interface ConsumptionInspection {
 id:string;roomId:string;unitId:string;stayId:string;staffId:string;staffName:string;
 startedAt:string;completedAt?:string;receivedAt?:string;receivedBy?:string;
 status:'draft'|'submitted'|'received';billing:'none'|'posted'|'review';
 items:InspectionItem[];additionalTotal:number;reviewTotal:number;
}
export type InspectionInput=Pick<InspectionItem,'productId'|'checked'|'consumed'|'remaining'|'divergence'|'note'>;
export interface GuestAccount {id:string;name:string;email:string;credentialDigest:string;createdAt:string}
export interface AccountSession {token:string;accountId:string;expiresAt:string}
export interface PrivilegeEntry {id:string;accountId:string;points:number;kind:'earned'|'reversed'|'redeemed';reference:string;description:string;createdAt:string;eligibleAmount?:number}
export interface PrivilegeBenefit {id:string;name:string;cost:number}
export interface OperationalState {
 version:1;inspections:ConsumptionInspection[];accounts:GuestAccount[];accountSessions:AccountSession[];points:PrivilegeEntry[];
 privilege:{brlPerPoint:number;includeConsumption:boolean;benefits:PrivilegeBenefit[]};
}
export type OperationalAction =
 {type:'START_CONSUMPTION_INSPECTION';roomId:string} |
 {type:'SUBMIT_CONSUMPTION_INSPECTION';inspectionId:string;items:InspectionInput[]} |
 {type:'RECEIVE_INSPECTION';inspectionId:string} |
 {type:'REGISTER_GUEST_ACCOUNT';name:string;email:string;credentialDigest:string;accessToken:string} |
 {type:'SIGN_IN_GUEST_ACCOUNT';email:string;credentialDigest:string;accessToken:string} |
 {type:'SIGN_OUT_GUEST_ACCOUNT';accessToken:string} |
 {type:'LINK_GUEST_ACCOUNT';stayId:string;token:string;accessToken:string} |
 {type:'REDEEM_PRIVILEGE';accessToken:string;benefitId:string;requestId:string} |
 {type:'CONFIGURE_PRIVILEGE';brlPerPoint:number;includeConsumption:boolean;benefits:PrivilegeBenefit[]};

const check:(value:unknown,message:string)=>asserts value=(value,message)=>{if(!value)throw new Error(message)};
const rounded=(n:number)=>Math.round(n*100)/100;
const id=(prefix:string)=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
const integer=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=10000;
export function initializeOperations(state:MotelState):MotelState {
 if(state.operations?.version===1)return state;
 const next:MotelState=JSON.parse(JSON.stringify(state));
 next.operations={version:1,inspections:[],accounts:[],accountSessions:[],points:[],
 privilege:{brlPerPoint:10,includeConsumption:true,benefits:[
 {id:'welcome',name:'Mimo de boas-vindas · simulado',cost:50},
 {id:'experience',name:'Experiência especial · simulada',cost:150},
 ]}};
 return next;
}
export function resolveActiveStay(state:MotelState,roomId:string,token:string) {
 return state.stays.find(stay=>stay.roomId===roomId&&stay.status==='active'&&!!token&&stay.token===token);
}
export function accountView(state:MotelState,accessToken:string,now=Date.now()) {
 const op=state.operations;
 const session=op?.accountSessions.find(s=>s.token===accessToken&&Date.parse(s.expiresAt)>now);
 const account=op?.accounts.find(a=>a.id===session?.accountId);
 if(!account||!op)return null;
 const entries=op.points.filter(e=>e.accountId===account.id);
 return {account:{id:account.id,name:account.name,email:account.email},
 balance:entries.reduce((sum,e)=>sum+e.points,0),entries,
 stays:state.stays.filter(s=>s.accountId===account.id&&s.status==='closed').map(s=>({
 id:s.id,roomId:s.roomId,checkIn:s.checkIn,closedAt:s.closedAt,
 paid:state.transactions.filter(t=>t.stayId===s.id&&t.type==='income'&&!t.refunded).reduce((n,t)=>n+t.amount,0),
 })),rules:op.privilege};
}
function sessionAccount(state:MotelState,token:string,now:string) {
 const view=accountView(state,token,Date.parse(now));check(view,'Acesso ao cadastro inválido ou expirado.');return view.account.id;
}
export function settlePrivilege(state:MotelState,now:string) {
 const op=state.operations!;
 for(const payment of state.transactions.filter(t=>t.type==='income'&&t.stayId)){
  const stay=state.stays.find(s=>s.id===payment.stayId);
  const earned=op.points.find(e=>e.kind==='earned'&&e.reference===payment.id);
  if(!earned&&!payment.refunded&&stay?.accountId&&stay.status==='closed'){
   const eligible=rounded(op.privilege.includeConsumption?payment.amount:Math.min(payment.amount,Math.max(0,stay.rate-(stay.discount??0))));
   const points=Math.floor(Math.round(eligible*100)/Math.round(op.privilege.brlPerPoint*100));
   op.points.push({id:id('points'),accountId:stay.accountId,points,kind:'earned',reference:payment.id,
    description:'Pagamento elegível da hospedagem',createdAt:now,eligibleAmount:eligible});
  }
  if(earned&&payment.refunded&&!op.points.some(e=>e.kind==='reversed'&&e.reference===payment.id)){
   op.points.push({id:id('points'),accountId:earned.accountId,points:-earned.points,kind:'reversed',reference:payment.id,
    description:'Reversão por estorno do pagamento',createdAt:now});
  }
 }
}
export function applyOperationalAction(state:MotelState,action:OperationalAction & {actorId?:string},now:string,actor:Role):'changed'|'noop' {
 const op=state.operations!;
 const audit=(message:string,roomId?:string)=>state.events.unshift({id:id('event'),message,roomId,
  unitId:roomId?state.rooms.find(r=>r.id===roomId)?.unitId:undefined,actor,createdAt:now});
 switch(action.type){
  case 'START_CONSUMPTION_INSPECTION':{
   const room=state.rooms.find(r=>r.id===action.roomId);check(room,'Suíte não encontrada.');
   const staff=state.staff.find(s=>s.id===action.actorId&&s.active);
   check(staff,'Identifique o funcionário responsável pela inspeção.');
   const stay=state.stays.filter(s=>s.roomId===room.id).sort((a,b)=>Date.parse(b.checkIn)-Date.parse(a.checkIn))[0];
   check(stay,'Não há hospedagem para conferir nesta suíte.');
   const draft=op.inspections.find(i=>i.roomId===room.id&&i.stayId===stay.id&&i.status==='draft');
   if(draft){check(draft.staffId===staff.id||actor==='owner'||actor==='manager','Uma inspeção já está em andamento por outro funcionário.');return 'noop';}
   const items=Object.entries(room.minibar).filter(([productId])=>state.products.some(p=>p.id===productId)&&state.unitStock?.[room.unitId]?.[productId]!==undefined)
    .map(([productId,expected]):InspectionItem=>{
     const product=state.products.find(p=>p.id===productId)!;
     const recorded=state.orders.filter(o=>o.stayId===stay.id&&o.productId===productId&&o.status==='confirmed').reduce((n,o)=>n+o.quantity,0)+(stay.reconciled[productId]??0)
      +state.reviews.filter(r=>r.stayId===stay.id&&r.productId===productId&&r.status==='pending').reduce((n,r)=>n+r.quantity,0);
     return {productId,name:product.name,expected,unitPrice:product.price,checked:false,consumed:Math.min(expected,recorded),
      remaining:Math.max(0,expected-recorded),divergence:false,note:'',additional:0,amount:0};
    });
   check(items.length,'Configure os produtos desta suíte no estoque da unidade.');
   op.inspections.unshift({id:id('inspection'),unitId:room.unitId,roomId:room.id,stayId:stay.id,staffId:staff.id,staffName:staff.name,
    startedAt:now,status:'draft',billing:'none',items,additionalTotal:0,reviewTotal:0});
   audit('Inspeção de consumo iniciada',room.id);return 'changed';
  }
  case 'SUBMIT_CONSUMPTION_INSPECTION':{
   const inspection=op.inspections.find(i=>i.id===action.inspectionId);check(inspection,'Inspeção não encontrada.');
   if(inspection.status!=='draft')return 'noop';
   check(inspection.staffId===action.actorId||actor==='owner'||actor==='manager','Somente o responsável pode concluir esta inspeção.');
   const room=state.rooms.find(r=>r.id===inspection.roomId)!;
   const stay=state.stays.find(s=>s.id===inspection.stayId);check(stay,'Hospedagem não encontrada.');
   const latest=state.stays.filter(s=>s.roomId===room.id).sort((a,b)=>Date.parse(b.checkIn)-Date.parse(a.checkIn))[0];
   check(!state.orders.some(o=>o.stayId===stay.id&&o.status==='pending'&&inspection.items.some(i=>i.productId===o.productId)),'Confirme os pedidos pendentes na recepção antes de finalizar a inspeção.');
   check(latest?.id===stay.id,'A suíte já iniciou outra hospedagem. Reinicie a inspeção atual.');
   check(action.items.length===inspection.items.length&&new Set(action.items.map(i=>i.productId)).size===inspection.items.length,'Confira todos os produtos, sem duplicações.');
   for(const item of inspection.items){
    const input=action.items.find(i=>i.productId===item.productId);
    check(input?.checked===true,'Marque todos os produtos como conferidos.');
    check(integer(input.consumed)&&integer(input.remaining)&&input.consumed<=item.expected&&(input.divergence||input.consumed+input.remaining===item.expected),'Consumo e saldo restante devem corresponder à quantidade prevista, ou ter divergência descrita.');
    check(typeof input.divergence==='boolean'&&typeof input.note==='string'&&input.note.length<=500,'Observação inválida.');
    check(!input.divergence||input.note.trim().length>=3,'Descreva a divergência encontrada.');
    const confirmed=state.orders.filter(o=>o.stayId===stay.id&&o.productId===item.productId&&o.status==='confirmed').reduce((n,o)=>n+o.quantity,0);
    const pending=state.reviews.filter(r=>r.stayId===stay.id&&r.productId===item.productId&&r.status==='pending').reduce((n,r)=>n+r.quantity,0);
    const already=stay.reconciled[item.productId]??0;
    const delta=Math.max(0,input.consumed-confirmed-already-pending);
    Object.assign(item,{checked:true,consumed:input.consumed,remaining:input.remaining,divergence:input.divergence,
     note:input.note.trim(),additional:delta,amount:rounded(delta*item.unitPrice)});
    if(delta===0)continue;
    const product=state.products.find(p=>p.id===item.productId)!;
    const stock=state.unitStock![room.unitId];check(stock[item.productId]>=delta,'Estoque insuficiente para reconciliar o consumo.');
    if(stay.status==='closed'){
     state.reviews.unshift({id:id('review'),inspectionId:inspection.id,stayId:stay.id,unitId:room.unitId,productId:item.productId,
      quantity:delta,amount:item.amount,status:'pending'});
     inspection.reviewTotal=rounded(inspection.reviewTotal+item.amount);
    }else{
     stock[item.productId]-=delta;product.stock-=delta;
     stay.reconciled[item.productId]=already+delta;
     (stay.minibarEntries??=[]).push({productId:item.productId,quantity:delta,unitPrice:item.unitPrice,total:item.amount,createdAt:now});
     stay.consumption=rounded(stay.consumption+item.amount);stay.total=rounded(stay.rate+stay.consumption);
     state.movements.unshift({id:id('movement'),productId:item.productId,quantity:-delta,reason:'Inspeção de consumo confirmada',unitId:room.unitId,createdAt:now});
     inspection.additionalTotal=rounded(inspection.additionalTotal+item.amount);
    }
   }
   inspection.billing=inspection.reviewTotal>0||inspection.items.some(i=>i.divergence)?'review':inspection.additionalTotal>0?'posted':'none';
   inspection.status='submitted';inspection.completedAt=now;
   audit('Inspeção e consumos enviados à recepção',room.id);return 'changed';
  }
  case 'RECEIVE_INSPECTION':{
   const inspection=op.inspections.find(i=>i.id===action.inspectionId);check(inspection&&inspection.status!=='draft','Inspeção ainda não foi concluída.');
   if(inspection.status==='received')return 'noop';
   inspection.status='received';inspection.receivedAt=now;inspection.receivedBy=action.actorId??actor;
   audit('Recepção recebeu a inspeção de consumo',inspection.roomId);return 'changed';
  }
  case 'REGISTER_GUEST_ACCOUNT':
  case 'SIGN_IN_GUEST_ACCOUNT':{
   const email=action.email.trim().toLowerCase();
   check(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)&&email.length<=160,'Informe um e-mail demonstrativo válido.');
   check(/^[a-f0-9]{64}$/.test(action.credentialDigest),'Código pessoal inválido.');
   check(action.accessToken.length>=20&&action.accessToken.length<=160&&!op.accountSessions.some(s=>s.token===action.accessToken),'Sessão de cadastro inválida.');
   let account=op.accounts.find(a=>a.email===email);
   if(action.type==='REGISTER_GUEST_ACCOUNT'){
    check(!account,'Já existe um cadastro com este e-mail. Use Entrar.');
    check(action.name.trim().length>=2&&action.name.length<=80,'Informe o nome do cadastro demonstrativo.');
    account={id:id('account'),name:action.name.trim(),email,credentialDigest:action.credentialDigest,createdAt:now};op.accounts.push(account);
   }else check(account&&account.credentialDigest===action.credentialDigest,'E-mail ou código pessoal inválido.');
   op.accountSessions.push({token:action.accessToken,accountId:account!.id,expiresAt:new Date(Date.parse(now)+12*3600000).toISOString()});
   return 'changed';
  }
  case 'SIGN_OUT_GUEST_ACCOUNT':{
   op.accountSessions=op.accountSessions.filter(s=>s.token!==action.accessToken);return 'changed';
  }
  case 'LINK_GUEST_ACCOUNT':{
   const stay=state.stays.find(s=>s.id===action.stayId);check(stay&&resolveActiveStay(state,stay.roomId,action.token),'Sessão da hospedagem inválida ou encerrada.');
   const accountId=sessionAccount(state,action.accessToken,now);
   check(!stay.accountId||stay.accountId===accountId,'Esta hospedagem já está vinculada a outro cadastro.');
   if(stay.accountId===accountId)return 'noop';stay.accountId=accountId;audit('Cadastro demonstrativo vinculado à hospedagem',stay.roomId);return 'changed';
  }
  case 'REDEEM_PRIVILEGE':{
   const accountId=sessionAccount(state,action.accessToken,now);
   check(action.requestId.length>=8&&action.requestId.length<=160,'Identificador de resgate inválido.');
   if(op.points.some(e=>e.kind==='redeemed'&&e.reference===action.requestId&&e.accountId===accountId))return 'noop';
   const benefit=op.privilege.benefits.find(b=>b.id===action.benefitId);check(benefit,'Benefício não encontrado.');
   const balance=op.points.filter(e=>e.accountId===accountId).reduce((n,e)=>n+e.points,0);
   check(balance>=benefit.cost,'Saldo insuficiente para este benefício.');
   op.points.push({id:id('points'),accountId,points:-benefit.cost,kind:'redeemed',reference:action.requestId,
    description:'Resgate simulado: '+benefit.name,createdAt:now});return 'changed';
  }
  case 'CONFIGURE_PRIVILEGE':{
   check(Number.isFinite(action.brlPerPoint)&&action.brlPerPoint>=1&&action.brlPerPoint<=10000,'Valor por ponto inválido.');
   check(typeof action.includeConsumption==='boolean'&&action.benefits.length>0&&action.benefits.length<=10,'Regras de benefícios inválidas.');
   check(new Set(action.benefits.map(b=>b.id)).size===action.benefits.length,'Benefícios duplicados.');
   for(const benefit of action.benefits)check(/^[a-z0-9-]{1,40}$/.test(benefit.id)&&benefit.name.trim().length>=3&&benefit.name.length<=100&&Number.isSafeInteger(benefit.cost)&&benefit.cost>0,'Benefício inválido.');
   op.privilege={brlPerPoint:rounded(action.brlPerPoint),includeConsumption:action.includeConsumption,benefits:action.benefits.map(b=>({...b,name:b.name.trim()}))};
   audit('Regras demonstrativas do MOTEL Privilege atualizadas');return 'changed';
  }
 }
}
