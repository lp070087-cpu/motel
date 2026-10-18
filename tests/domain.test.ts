import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,reducer,cleaningChecklist,type Action,type MotelState} from '../lib/domain';
const now=new Date().toISOString();
const later=(hours:number)=>new Date(Date.parse(now)+hours*3600000).toISOString();
const apply=(s:MotelState,a:Action)=>reducer(s,{...a,now});
test('reservation → check-in → guest order → checkout → cleaning → inspection',()=>{
 let s=initialState();const room=s.rooms.find(r=>r.status==='available')!;
 s=apply(s,{type:'RESERVE',roomId:room.id,guestName:'Pessoa Fictícia',email:'teste@example.com',start:later(1),end:later(4)});
 const reservation=s.reservations[0];assert.equal(s.rooms.find(r=>r.id===room.id)?.status,'reserved');
 assert.throws(()=>apply(s,{type:'RESERVE',roomId:room.id,guestName:'Outra Pessoa',email:'outro@example.com',start:later(2),end:later(3)}),/conflita/);
 s=apply(s,{type:'CHECK_IN',roomId:room.id,guestName:reservation.guestName,reservationId:reservation.id});const stay=s.stays[0];assert.equal(stay.status,'active');
 s=apply(s,{type:'ORDER',stayId:stay.id,token:stay.token,productId:'p1',quantity:2,actor:'guest'});const order=s.orders[0];
 assert.throws(()=>apply(s,{type:'CHECK_OUT',stayId:stay.id}),/pendentes/);
 const stock=s.products[0].stock;
 s=apply(s,{type:'CONFIRM_ORDER',orderId:order.id,actor:'reception'});assert.equal(s.products[0].stock,stock-2);
 const confirmed=s;assert.equal(apply(s,{type:'CONFIRM_ORDER',orderId:order.id}),confirmed);
 s=apply(s,{type:'RECONCILE_MINIBAR',roomId:room.id,productId:'p1',quantity:2,actor:'housekeeper'});assert.equal(s,confirmed);
 s=apply(s,{type:'RECONCILE_MINIBAR',roomId:room.id,productId:'p1',quantity:3,actor:'housekeeper'});assert.equal(s.stays[0].consumption,24);
 s=apply(s,{type:'CHECK_OUT',stayId:stay.id,actor:'reception'});assert.equal(s.rooms.find(r=>r.id===room.id)?.status,'dirty');const payment=s.transactions[0];assert.equal(payment.amount,stay.rate+24);assert.equal(apply(s,{type:'CHECK_OUT',stayId:stay.id}),s);
 assert.throws(()=>apply(s,{type:'ORDER',stayId:stay.id,token:stay.token,productId:'p1',quantity:1,actor:'guest'}),/encerrada/);
 s=apply(s,{type:'START_CLEANING',roomId:room.id,actor:'housekeeper'});
 assert.throws(()=>apply(s,{type:'FINISH_CLEANING',roomId:room.id,checklist:['Piso'],actor:'housekeeper'}),/checklist/);
 s=apply(s,{type:'FINISH_CLEANING',roomId:room.id,checklist:cleaningChecklist,actor:'housekeeper'});assert.equal(s.rooms.find(r=>r.id===room.id)?.status,'inspection');
 assert.throws(()=>apply(s,{type:'INSPECT',roomId:room.id,actor:'housekeeper'}),/recepção|gerência/);
 s=apply(s,{type:'INSPECT',roomId:room.id,actor:'manager'});assert.equal(s.rooms.find(r=>r.id===room.id)?.status,'available');
});
test('closed-stay minibar differences require review and never alter paid bill',()=>{
 let s=initialState();const stay=s.stays[0];s=apply(s,{type:'CHECK_OUT',stayId:stay.id});const paid=s.transactions[0].amount;const total=s.stays[0].total;
 s=apply(s,{type:'RECONCILE_MINIBAR',roomId:stay.roomId,productId:'p1',quantity:2,actor:'housekeeper'});assert.equal(s.reviews.length,1);assert.equal(s.stays[0].total,total);assert.equal(s.transactions[0].amount,paid);
 assert.equal(apply(s,{type:'RECONCILE_MINIBAR',roomId:stay.roomId,productId:'p1',quantity:2,actor:'housekeeper'}),s);
 s=apply(s,{type:'APPROVE_REVIEW',reviewId:s.reviews[0].id,actor:'manager'});assert.equal(s.reviews[0].status,'approved');assert.equal(s.transactions[0].amount,paid);assert.equal(s.stays[0].total,total);assert.equal(apply(s,{type:'APPROVE_REVIEW',reviewId:s.reviews[0].id}),s);
});
test('temporary guest tokens are scoped and role gates prevent financial writes',()=>{
 const s=initialState(),stay=s.stays[0];
 assert.throws(()=>apply(s,{type:'ORDER',stayId:stay.id,token:'another-session',productId:'p1',quantity:1,actor:'guest'}),/Sessão/);
 assert.throws(()=>apply(s,{type:'EXPENSE',description:'Teste',amount:10,unitId:'u1',actor:'reception'}),/gerência/);
 assert.throws(()=>apply(s,{type:'UPDATE_SETTINGS',settings:{networkName:'Outra'},actor:'guest'}),/permissão/);
 assert.throws(()=>apply(s,{type:'ORDER',stayId:stay.id,productId:'p1',quantity:-1}),/quantidade/);
 assert.equal(s.products[0].stock,180);
});
test('tariff changes preserve active rates; refund is idempotent; stock transfer is conserved',()=>{
 let s=initialState();const t=s.stays[0];s=apply(s,{type:'UPDATE_TARIFF',roomId:t.roomId,rate:999});assert.equal(s.stays[0].rate,t.rate);
 const tx=s.transactions[0];s=apply(s,{type:'REFUND',transactionId:tx.id});assert.equal(s.transactions.filter(v=>v.type==='refund').length,1);assert.equal(apply(s,{type:'REFUND',transactionId:tx.id}),s);
 const stock=s.products[0].stock,r=s.rooms[0],minibar=r.minibar.p1;s=apply(s,{type:'RESTOCK_ROOM',roomId:r.id,productId:'p1',quantity:2,actor:'housekeeper'});assert.equal(s.products[0].stock,stock-2);assert.equal(s.rooms[0].minibar.p1,minibar+2);
});
test('maintenance blocks release until all open tickets resolve',()=>{
 let s=initialState();const r=s.rooms.find(r=>r.status==='available')!;
 s=apply(s,{type:'OPEN_TICKET',roomId:r.id,title:'Ajustar climatização',priority:'high',block:true});const ticket=s.tickets[0];assert.equal(s.rooms.find(v=>v.id===r.id)?.status,'maintenance');
 s=apply(s,{type:'CLOSE_TICKET',ticketId:ticket.id});assert.equal(s.rooms.find(v=>v.id===r.id)?.status,'inspection');s=apply(s,{type:'INSPECT',roomId:r.id});assert.equal(s.rooms.find(v=>v.id===r.id)?.status,'available');
});
test('overnight reserve charges overnight tariff and adjacent reservations are allowed',()=>{
 let s=initialState();const r=s.rooms.find(v=>v.status==='available')!;
 s=apply(s,{type:'RESERVE',roomId:r.id,guestName:'Pessoa Demo',email:'demo@example.com',start:later(4),end:later(16),overnight:true});assert.equal(s.reservations[0].total,r.overnightRate);
 s=apply(s,{type:'RESERVE',roomId:r.id,guestName:'Pessoa Demo',email:'demo@example.com',start:later(16),end:later(19)});assert.equal(s.reservations.filter(v=>v.roomId===r.id).length,2);
});
test('moving a reserved stay completes its reservation in the destination suite',()=>{
 let s=initialState();const available=s.rooms.filter(v=>v.unitId==='u1'&&v.status==='available');const original=available[0],destination=available[1];
 s=apply(s,{type:'RESERVE',roomId:original.id,guestName:'Pessoa Demo',email:'demo@example.com',start:later(1),end:later(4)});const reservationId=s.reservations[0].id;
 s=apply(s,{type:'CHECK_IN',roomId:original.id,reservationId,guestName:'Pessoa Demo'});const stayId=s.stays[0].id;
 s=apply(s,{type:'MOVE_STAY',stayId,roomId:destination.id});assert.equal(s.reservations[0].roomId,destination.id);assert.equal(s.rooms.find(r=>r.id===original.id)?.status,'dirty');
 s=apply(s,{type:'CHECK_OUT',stayId});assert.equal(s.reservations[0].status,'completed');
});
test('open maintenance prevents automatic release when inspections are disabled',()=>{
 let s=initialState();const r=s.rooms.find(v=>v.status==='dirty')!;
 s=apply(s,{type:'UPDATE_SETTINGS',settings:{requireInspection:false}});
 s=apply(s,{type:'OPEN_TICKET',roomId:r.id,title:'Verificar ponto elétrico',priority:'high'});
 s=apply(s,{type:'START_CLEANING',roomId:r.id,actor:'housekeeper'});
 s=apply(s,{type:'FINISH_CLEANING',roomId:r.id,checklist:cleaningChecklist,actor:'housekeeper'});assert.equal(s.rooms.find(v=>v.id===r.id)?.status,'inspection');
 assert.throws(()=>apply(s,{type:'INSPECT',roomId:r.id}),/chamados/);
});
test('public guest can reserve and cancel within the configured cancellation window',()=>{
 let s=initialState();const room=s.rooms.find(r=>r.status==='available')!;
 s=apply(s,{type:'RESERVE',actor:'guest',roomId:room.id,guestName:'Cliente Público Demo',email:'publico@example.com',start:later(6),end:later(9)});
 const reservation=s.reservations[0];assert.equal(reservation.status,'confirmed');assert.equal(s.rooms.find(r=>r.id===room.id)?.status,'reserved');
 s=apply(s,{type:'CANCEL_RESERVATION',actor:'guest',reservationId:reservation.id});assert.equal(s.reservations[0].status,'cancelled');assert.equal(s.rooms.find(r=>r.id===room.id)?.status,'available');
 assert.equal(apply(s,{type:'CANCEL_RESERVATION',actor:'guest',reservationId:reservation.id}),s);
});
test('invalid runtime roles cannot bypass demo permission guards',()=>{
 const s=initialState();
 assert.throws(()=>apply(s,{type:'EXPENSE',actor:'superuser',unitId:'u1',description:'Tentativa inválida',amount:10} as unknown as Action),/Perfil/);
});
test('extra hours apply configured tariff to walk-in and extended reservation periods',()=>{
 let s=initialState();const available=s.rooms.filter(r=>r.status==='available');const r=available[0];
 s=apply(s,{type:'CHECK_IN',roomId:r.id,guestName:'Pessoa Fictícia',hours:5});assert.equal(s.stays[0].rate,r.rate+2*r.extraHourRate);
 const second=available[1];s=apply(s,{type:'RESERVE',actor:'guest',roomId:second.id,guestName:'Pessoa Demo',email:'demo@example.com',start:later(5),end:later(10)});assert.equal(s.reservations[0].total,second.rate+2*second.extraHourRate);
});
