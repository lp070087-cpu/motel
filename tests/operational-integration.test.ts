import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {initialState,migrateState,reducer,cleaningChecklist,roomLedColor,type MotelState,type Action} from '../lib/domain';
import {accountView,resolveActiveStay,type InspectionInput} from '../lib/operational-domain';
import {guestGuide,buildGuideGraph,shortestGuidePath,suiteEntryPath} from '../lib/indoor-guide';
const now='2026-10-19T15:00:00.000Z';
const run=(s:MotelState,a:Action)=>reducer(s,{...a,now});
function setup(unitId='u1'){
 let state=initialState();const room=state.rooms.find(r=>r.unitId===unitId&&r.status==='available')!;
 state=run(state,{type:'CHECK_IN',roomId:room.id,guestName:'',arrivalMode:'foot'});
 const staff=state.staff.find(s=>s.id===room.assignedTo)!;
 const cleaner={actor:'housekeeper' as const,actorId:staff.id,actorUnitId:unitId};
 return {state,room,cleaner,stay:state.stays[0]};
}
function inspected(state:MotelState,consumed:Record<string,number>):InspectionInput[]{
 return state.operations!.inspections[0].items.map(i=>({productId:i.productId,checked:true,consumed:consumed[i.productId]??0,remaining:i.expected-(consumed[i.productId]??0),divergence:false,note:''}));
}
test('A: item OK creates no consumption; a submitted inspection charges only the unrecorded difference once',()=>{
 let {state,room,cleaner,stay}=setup();
 state=run(state,{type:'ORDER',stayId:stay.id,productId:'p1',quantity:1});
 state=run(state,{type:'CONFIRM_ORDER',orderId:state.orders[0].id});
 state=run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:room.id,...cleaner});
 const inspection=state.operations!.inspections[0];
 assert.equal(inspection.staffId,cleaner.actorId);assert.equal(inspection.startedAt,now);
 assert.equal(inspection.items.length,Object.keys(room.minibar).length);
 const before=state.stays[0].total,price=state.products.find(p=>p.id==='p1')!.price;
 const action:Action={type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:inspected(state,{p1:2}),...cleaner};
 state=run(state,action);
 assert.equal(state.stays[0].total,before+price);
 assert.equal(state.stays[0].reconciled.p1,1);
 assert.equal(state.operations!.inspections[0].items.find(i=>i.productId==='p2')!.amount,0);
 assert.equal(state.operations!.inspections[0].additionalTotal,price);
 assert.equal(state.operations!.inspections[0].status,'submitted');
 assert.equal(run(state,action),state);
 state=run(state,{type:'RECEIVE_INSPECTION',inspectionId:inspection.id,actor:'reception',actorUnitId:room.unitId});
 assert.equal(state.operations!.inspections[0].status,'received');
 state=run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:room.id,...cleaner});
 state=run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:state.operations!.inspections[0].id,items:inspected(state,{p1:2}),...cleaner});
 assert.equal(state.stays[0].total,before+price);assert.equal(state.operations!.inspections[0].additionalTotal,0);
});
test('A: incomplete, inconsistent or unexplained inspection fails atomically; prices cannot be supplied by the cleaner',()=>{
 let {state,room,cleaner}=setup();
 state=run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:room.id,...cleaner});
 const inspection=state.operations!.inspections[0],items=inspected(state,{});
 assert.throws(()=>run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:items.slice(1),...cleaner}),/todos/);
 assert.throws(()=>run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:items.map((i,n)=>({...i,checked:n!==0})),...cleaner}),/conferidos/);
 assert.throws(()=>run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:items.map((i,n)=>({...i,remaining:n===0?99:i.remaining})),...cleaner}),/quantidade prevista/);
 assert.throws(()=>run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:items.map((i,n)=>({...i,divergence:n===0,note:''})),...cleaner}),/Descreva/);
 const malicious=inspected(state,{p1:1}).map(i=>({...i,unitPrice:.01,amount:.01}));
 const next=run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:inspection.id,items:malicious,...cleaner});
 assert.equal(next.operations!.inspections[0].additionalTotal,state.products.find(p=>p.id==='p1')!.price);
 assert.equal(state.operations!.inspections[0].status,'draft');
});
test('A: inspection of a paid stay creates an authorized review and leaves the receipt unchanged',()=>{
 let {state,room,cleaner,stay}=setup();
 state=run(state,{type:'CHECK_OUT',stayId:stay.id});const paid=state.transactions[0].amount,total=state.stays[0].total;
 state=run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:room.id,...cleaner});
 const id=state.operations!.inspections[0].id;
 state=run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:id,items:inspected(state,{p1:1}),...cleaner});
 assert.equal(state.transactions[0].amount,paid);assert.equal(state.stays[0].total,total);
 assert.equal(state.operations!.inspections[0].billing,'review');assert.equal(state.reviews[0].inspectionId,id);
 assert.throws(()=>run(state,{type:'APPROVE_REVIEW',reviewId:state.reviews[0].id,...cleaner}),/gerência|recepção/);
 state=run(state,{type:'APPROVE_REVIEW',reviewId:state.reviews[0].id});assert.equal(state.transactions[0].amount,paid);
});
test('B: cleaning has its own timestamp and checklist and requires authorized release',()=>{
 let {state,room,cleaner,stay}=setup();
 state=run(state,{type:'CHECK_OUT',stayId:stay.id});
 state=run(state,{type:'START_CLEANING',roomId:room.id,...cleaner});
 assert.equal(state.rooms.find(r=>r.id===room.id)!.cleaningStartedAt,now);
 assert.equal(state.operations!.inspections.length,0);
 assert.throws(()=>run(state,{type:'FINISH_CLEANING',roomId:room.id,checklist:cleaningChecklist.slice(0,-1),...cleaner}),/checklist/);
 state=run(state,{type:'FINISH_CLEANING',roomId:room.id,checklist:cleaningChecklist,...cleaner});
 assert.equal(state.rooms.find(r=>r.id===room.id)!.status,'inspection');
 state=run(state,{type:'INSPECT',roomId:room.id});assert.equal(roomLedColor(state.rooms.find(r=>r.id===room.id)!.status),'#39b978');
});
test('C: only the checked-in online stay can obtain its connected indoor route',()=>{
 let state=initialState();const room=state.rooms.find(r=>r.status==='available')!;
 state=run(state,{type:'RESERVE',roomId:room.id,guestName:'Pessoa demonstrativa',email:'guide@example.com',start:'2026-10-19T16:00:00.000Z',end:'2026-10-19T19:00:00.000Z'});
 state=run(state,{type:'CHECK_IN',roomId:room.id,guestName:'Pessoa demonstrativa',reservationId:state.reservations[0].id});
 const stay=state.stays[0],guide=guestGuide(state,room.id,stay.token);
 assert.equal(guide.path[0].kind,'entrance');assert.equal(guide.path[1].kind,'portaria');assert.equal(guide.path.at(-1)?.kind,'door');
 for(let i=1;i<guide.path.length;i++){
  assert.ok(guide.graph.edges.some(([a,b])=>[a,b].includes(guide.path[i-1].id)&&[a,b].includes(guide.path[i].id)));
  assert.ok(guide.path[i].x===guide.path[i-1].x||guide.path[i].z===guide.path[i-1].z,'route crosses walls diagonally');
 }
 assert.throws(()=>guestGuide(state,room.id,'wrong'),/online/);
 state=run(state,{type:'CHECK_OUT',stayId:stay.id});assert.throws(()=>guestGuide(state,room.id,stay.token),/online/);
});
test('C: each unit has a connected corridor graph for every suite, including expanded layouts',()=>{
 for(const unit of initialState().units)for(const count of [25,40,60]){
  const graph=buildGuideGraph(unit.id,count);
  for(let i=0;i<count;i++)assert.equal(shortestGuidePath(graph,'door-'+i).at(-1)?.id,'door-'+i);
 }
});
test('D/F: fixed suite QR carries no session or personal data; activation and billing stay room-scoped',async()=>{
 const {state,room,stay}=setup();const other=state.rooms.find(r=>r.unitId==='u2')!;
 const path=suiteEntryPath(room.id);assert.equal(path,'/suite/'+room.id);assert.ok(!path.includes(stay.token));assert.ok(!path.includes('?'));
 const svg=await QRCode.toString('https://demo.example'+path,{type:'svg',margin:4});assert.ok(svg.includes('<svg'));
 assert.equal(resolveActiveStay(state,other.id,stay.token),undefined);
 assert.equal(resolveActiveStay(state,room.id,'public-room-id'),undefined);
 assert.equal(resolveActiveStay(state,room.id,stay.token)?.id,stay.id);
 assert.throws(()=>guestGuide(state,room.id,stay.token),/online/);
 let next=run(state,{type:'ORDER',stayId:stay.id,token:stay.token,productId:'p1',quantity:1,actor:'guest'});
 assert.equal(next.stays[0].total,stay.total);
 next=run(next,{type:'CONFIRM_ORDER',orderId:next.orders[0].id});assert.ok(next.stays[0].total>stay.total);
 next=run(next,{type:'CHECK_OUT',stayId:stay.id});assert.equal(resolveActiveStay(next,room.id,stay.token),undefined);
 assert.throws(()=>run(next,{type:'ORDER',stayId:stay.id,token:stay.token,productId:'p1',quantity:1,actor:'guest'}),/encerrada/);
});
test('E: points require a linked account and paid eligible transaction; retries and refunds are idempotent',()=>{
 let {state,stay}=setup();const accessToken='account-session-token-one-12345';
 state=run(state,{type:'REGISTER_GUEST_ACCOUNT',name:'Pessoa Demo',email:'points@example.com',credentialDigest:'a'.repeat(64),accessToken,actor:'guest'});
 state=run(state,{type:'LINK_GUEST_ACCOUNT',stayId:stay.id,token:stay.token,accessToken,actor:'guest'});
 assert.equal(accountView(state,accessToken,Date.parse(now))!.balance,0);
 state=run(state,{type:'CHECK_OUT',stayId:stay.id});
 const transaction=state.transactions[0],points=Math.floor(transaction.amount/10);
 assert.equal(accountView(state,accessToken,Date.parse(now))!.balance,points);
 assert.equal(run(state,{type:'CHECK_OUT',stayId:stay.id}),state);
 const closed=state;assert.throws(()=>run(state,{type:'LINK_GUEST_ACCOUNT',stayId:stay.id,token:stay.token,accessToken,actor:'guest'}),/encerrada/);
 state=run(state,{type:'REFUND',transactionId:transaction.id});assert.equal(accountView(state,accessToken,Date.parse(now))!.balance,0);
 assert.equal(run(state,{type:'REFUND',transactionId:transaction.id}),state);
 assert.equal(closed.operations!.points.length,1);
 const anonymous=setup();const noAccount=run(anonymous.state,{type:'CHECK_OUT',stayId:anonymous.stay.id});assert.equal(noAccount.operations!.points.length,0);
});
test('E/F: account credentials, expiry, benefit costs and redemption identifiers protect personal points',()=>{
 let {state,stay}=setup();const first='account-session-first-12345',second='account-session-second-12345';
 state=run(state,{type:'REGISTER_GUEST_ACCOUNT',name:'Pessoa Um',email:'one@example.com',credentialDigest:'a'.repeat(64),accessToken:first,actor:'guest'});
 state=run(state,{type:'REGISTER_GUEST_ACCOUNT',name:'Pessoa Dois',email:'two@example.com',credentialDigest:'b'.repeat(64),accessToken:second,actor:'guest'});
 assert.throws(()=>run(state,{type:'SIGN_IN_GUEST_ACCOUNT',email:'one@example.com',credentialDigest:'b'.repeat(64),accessToken:'another-session-token-12345',actor:'guest'}),/inválido/);
 assert.equal(accountView(state,'unknown'),null);assert.equal(accountView(state,first,Date.parse(now)+13*3600000),null);
 state=run(state,{type:'LINK_GUEST_ACCOUNT',stayId:stay.id,token:stay.token,accessToken:first,actor:'guest'});
 assert.throws(()=>run(state,{type:'LINK_GUEST_ACCOUNT',stayId:stay.id,token:stay.token,accessToken:second,actor:'guest'}),/outro cadastro/);
 state=run(state,{type:'CONFIGURE_PRIVILEGE',brlPerPoint:10,includeConsumption:true,benefits:[{id:'demo',name:'Mimo demonstrativo',cost:2}]});
 state=run(state,{type:'CHECK_OUT',stayId:stay.id});
 const action:Action={type:'REDEEM_PRIVILEGE',accessToken:first,benefitId:'demo',requestId:'redeem-request-one',actor:'guest'};
 const before=accountView(state,first,Date.parse(now))!.balance;state=run(state,action);
 assert.equal(accountView(state,first,Date.parse(now))!.balance,before-2);assert.equal(run(state,action),state);
 assert.equal(accountView(state,second,Date.parse(now))!.entries.length,0);
 assert.equal(accountView(state,second,Date.parse(now))!.stays.length,0);
});
test('F: inspection identity and unit isolation reject another suite or unauthorized receipt',()=>{
 const {state,room,cleaner}=setup();
 assert.throws(()=>run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:state.rooms.find(r=>r.unitId==='u2')!.id,...cleaner}),/outra unidade/);
 const next=run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:room.id,...cleaner});
 assert.throws(()=>run(next,{type:'RECEIVE_INSPECTION',inspectionId:next.operations!.inspections[0].id,...cleaner}),/recepção|gerência/);
 assert.throws(()=>run(next,{type:'CONFIGURE_PRIVILEGE',brlPerPoint:1,includeConsumption:true,benefits:[{id:'fake',name:'Fake',cost:1}],...cleaner}),/recepção|gerência/);
});
test('migration preserves existing histories and initializes operational data exactly once',()=>{
 const state=initialState();assert.ok(state.operations);assert.equal(migrateState(state),state);
 const legacy=structuredClone(state);delete legacy.operations;
 const migrated=migrateState(legacy);assert.deepEqual(migrated.transactions,legacy.transactions);assert.deepEqual(migrated.stays,legacy.stays);
 assert.equal(migrateState(migrated),migrated);
});

test('pending deliveries must be resolved before inspection; later confirmation does not double the observed consumption',()=>{
 let {state,room,cleaner,stay}=setup();
 state=run(state,{type:'ORDER',stayId:stay.id,productId:'p1',quantity:1});
 const orderId=state.orders[0].id;
 state=run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:room.id,...cleaner});
 const action:Action={type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:state.operations!.inspections[0].id,items:inspected(state,{p1:1}),...cleaner};
 assert.throws(()=>run(state,action),/pedidos pendentes/);
 state=run(state,{type:'CONFIRM_ORDER',orderId});
 const total=state.stays[0].total;state=run(state,action);assert.equal(state.stays[0].total,total);
});
test('zero-point payments are recorded and cannot acquire points retroactively after a rules change',()=>{
 let {state,stay,room}=setup();const accessToken='zero-points-account-session-123';
 state=run(state,{type:'REGISTER_GUEST_ACCOUNT',name:'Pessoa Zero',email:'zero@example.com',credentialDigest:'c'.repeat(64),accessToken,actor:'guest'});
 state=run(state,{type:'LINK_GUEST_ACCOUNT',stayId:stay.id,token:stay.token,accessToken,actor:'guest'});
 state=run(state,{type:'CONFIGURE_PRIVILEGE',brlPerPoint:1000,includeConsumption:true,benefits:[{id:'demo',name:'Mimo de teste',cost:1}]});
 state=run(state,{type:'CHECK_OUT',stayId:stay.id});const firstPayment=state.transactions[0].id;
 assert.equal(accountView(state,accessToken,Date.parse(now))!.balance,0);
 assert.equal(state.operations!.points.find(e=>e.reference===firstPayment)!.points,0);
 state=run(state,{type:'CONFIGURE_PRIVILEGE',brlPerPoint:10,includeConsumption:true,benefits:[{id:'demo',name:'Mimo de teste',cost:1}]});
 const other=state.rooms.find(r=>r.unitId===room.unitId&&r.status==='available')!;
 state=run(state,{type:'CHECK_IN',roomId:other.id,guestName:'',arrivalMode:'foot'});
 const nextStay=state.stays[0];
 state=run(state,{type:'LINK_GUEST_ACCOUNT',stayId:nextStay.id,token:nextStay.token,accessToken,actor:'guest'});
 state=run(state,{type:'CHECK_OUT',stayId:nextStay.id});
 assert.equal(state.operations!.points.filter(e=>e.reference===firstPayment).length,1);
 assert.equal(state.operations!.points.find(e=>e.reference===firstPayment)!.points,0);
 assert.equal(accountView(state,accessToken,Date.parse(now))!.balance,Math.floor(state.transactions[0].amount/10));
});
test('an online source flag without a linked reservation cannot grant the exclusive guide',()=>{
 let {state,room,stay}=setup();state.stays[0].source='online';assert.throws(()=>guestGuide(state,room.id,stay.token),/online/);
});

test('unexplained missing stock is sent as a discrepancy and never silently interpreted as consumption',()=>{
 let {state,room,cleaner}=setup();
 state=run(state,{type:'START_CONSUMPTION_INSPECTION',roomId:room.id,...cleaner});
 const total=state.stays[0].total;
 const items=inspected(state,{}).map(i=>i.productId==='p1'?{...i,remaining:i.remaining-1,divergence:true,note:'Item ausente sem consumo confirmado'}:i);
 state=run(state,{type:'SUBMIT_CONSUMPTION_INSPECTION',inspectionId:state.operations!.inspections[0].id,items,...cleaner});
 assert.equal(state.stays[0].total,total);
 assert.equal(state.operations!.inspections[0].billing,'review');
 assert.equal(state.operations!.inspections[0].additionalTotal,0);
 assert.equal(state.operations!.inspections[0].items.find(i=>i.productId==='p1')!.consumed,0);
});
