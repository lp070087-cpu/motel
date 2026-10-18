"use client";

import {useEffect, useState} from 'react';
import Photo from './Photo';
import {ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, MapPin, ShieldCheck, Users} from 'lucide-react';
import {useMotel} from '../lib/store';
import {money, type Room, type Unit} from '../lib/domain';
import {roomProfile} from '../lib/catalog';

const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export default function SuiteDetail({room,unit,onBack,onHistory,initialDate,initialPeriod}:{room:Room;unit:Unit;onBack:()=>void;onHistory:(email:string)=>void;initialDate:string;initialPeriod:string}){
  const {state,dispatch}=useMotel();
  const profile=roomProfile(room);
  const [photo,setPhoto]=useState(0);
  const [date,setDate]=useState(initialDate);
  const [time,setTime]=useState('20:00');
  const [period,setPeriod]=useState(initialPeriod);
  const [name,setName]=useState('');const [email,setEmail]=useState('');
  const [feedback,setFeedback]=useState('');const [confirmed,setConfirmed]=useState(false);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{window.scrollTo(0,0);const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer)},[]);
  const rate=period==='12'?room.overnightRate:room.rate;
  function availability(hour:string){
    const start=new Date(`${date}T${hour}`).getTime(),end=start+Number(period)*3600000;
    if(!Number.isFinite(start)||start<now-60000)return 'Horário já passou';
    if(!['available','reserved','occupied'].includes(room.status))return 'Suíte indisponível';
    if(state.reservations.some(r=>r.roomId===room.id&&r.status==='confirmed'&&start<Date.parse(r.end)&&end>Date.parse(r.start)))return 'Reservado neste período';
    if(state.stays.some(s=>s.roomId===room.id&&s.status==='active'&&start<Date.parse(s.expectedOut)&&end>Date.parse(s.checkIn)))return 'Hospedagem neste período';
    return '';
  }
  const unavailable=availability(time);
  function book(event:React.FormEvent){
    event.preventDefault();if(unavailable){setFeedback(unavailable);return;}
    const start=new Date(`${date}T${time}`),end=new Date(start.getTime()+Number(period)*3600000);
    const result=dispatch({type:'RESERVE',roomId:room.id,guestName:name,email,start:start.toISOString(),end:end.toISOString(),overnight:period==='12',actor:'guest'});
    setFeedback(result.ok?'Sua reserva foi confirmada nesta demonstração. Nenhum pagamento foi cobrado.':result.error||'Não foi possível reservar.');
    if(result.ok)setConfirmed(true);
  }
  function focusBooking(){document.getElementById('suite-booking')?.scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('suite-date')?.focus({preventScroll:true})}
  return <>
    <header className="pub-header suite-header"><button className="pub-wordmark" onClick={onBack}>MOTEL<span>PRIVATE COLLECTION</span></button><button className="pub-text-button" onClick={onBack}><ArrowLeft size={16}/> Suítes de {unit.name}</button></header>
    <main className="suite-detail">
      <div className="suite-breadcrumb"><MapPin size={14}/>{unit.city} / {unit.name} / Suíte {room.number}</div>
      <section className="suite-title"><div><p className="pub-eyebrow">{room.category} · SUÍTE {room.number}</p><h1>{profile.name}</h1></div><p><Users size={16}/>{profile.capacity} pessoas <span>·</span> <ShieldCheck size={16}/> Privacidade</p></section>
      <section className="suite-gallery" aria-label="Galeria de fotografias demonstrativas">
        <div className="suite-gallery-main"><Photo nativeSize priority sizes="(max-width: 900px) 100vw, 65vw" src={profile.images[photo]} alt={`Fotografia demonstrativa de interior · ${profile.name} · vista ${photo+1}`}/><div className="suite-photo-caption">INTERIORES DEMONSTRATIVOS · {photo+1} / {profile.images.length}</div><div className="suite-photo-controls"><button aria-label="Foto anterior" onClick={()=>setPhoto((photo+profile.images.length-1)%profile.images.length)}><ChevronLeft size={20}/></button><button aria-label="Próxima foto" onClick={()=>setPhoto((photo+1)%profile.images.length)}><ChevronRight size={20}/></button></div></div>
        <div className="suite-thumbnails">{profile.images.map((src,index)=><button key={`${src}-${index}`} className={index===photo?'active':''} aria-label={`Ver fotografia ${index+1}`} aria-pressed={photo===index} onClick={()=>setPhoto(index)}><Photo sizes="96px" src={src} alt={`Interior demonstrativo ${index+1}`} loading="lazy"/></button>)}</div>
      </section>
      <div className="suite-body"><div className="suite-editorial">
        <section><p className="pub-eyebrow">UM ESPAÇO PARA O SEU TEMPO</p><h2>Conheça a {profile.name}.</h2><p>{profile.description}</p><p className="suite-photo-note">Fotografias fornecidas pelo proprietário, usadas como referência de atmosfera. A galeria reúne ambientes ilustrativos e não ângulos de uma mesma suíte real. Todos os estabelecimentos desta coleção são fictícios.</p></section>
        <section><h2>Conforto em cada detalhe.</h2><ul className="suite-amenities">{profile.amenities.map(item=><li key={item}><Check size={16}/>{item}</li>)}</ul></section>
        <section><h2>Escolha seu tempo.</h2><div className="suite-tariffs"><div><Clock3 size={18}/><span>Período de 3 horas</span><strong>{money(room.rate)}</strong></div><div><Clock3 size={18}/><span>Pernoite de 12 horas</span><strong>{money(room.overnightRate)}</strong></div><div><Clock3 size={18}/><span>Hora adicional</span><strong>{money(room.extraHourRate)}</strong></div></div><p className="suite-small">Hora adicional sujeita à disponibilidade e solicitação à recepção durante a hospedagem.</p></section>
        <section><h2>Antes de reservar.</h2><div className="suite-policy"><p><strong>Reserva e confirmação</strong>Escolha a data e o horário. O período fica reservado após a confirmação, com disponibilidade verificada novamente no envio.</p><p><strong>Cancelamento</strong>Disponível em Minhas reservas até {state.settings.cancellationHours} horas antes da entrada.</p><p><strong>Durante a hospedagem</strong>Produtos e serviços são cobrados separadamente na conta demonstrativa. O pernoite corresponde a 12 horas a partir do horário escolhido.</p><p><strong>Localização</strong>{unit.address}. Endereço fictício em {unit.city}.</p></div></section>
      </div><aside id="suite-booking" className="suite-booking">
        {confirmed?<div className="suite-confirmed" role="status"><Check size={32}/><p className="pub-eyebrow">RESERVA CONFIRMADA</p><h2>Seu tempo está reservado.</h2><p>{feedback}</p><p>{new Date(`${date}T${time}`).toLocaleString('pt-BR')} · {period} horas<br/>{profile.name} · Suíte {room.number}</p><button className="pub-dark-button" onClick={()=>onHistory(email)}>Ver minha reserva <ArrowRight size={17}/></button></div>:<form onSubmit={book}>
          <p className="pub-eyebrow">SUA PRÓXIMA PAUSA</p><div className="suite-booking-price"><strong>{money(rate)}</strong><span>/ {period==='12'?'pernoite':'3 horas'}</span></div>
          <div className="suite-booking-fields"><label>Data de entrada<input id="suite-date" type="date" required min={localDate(new Date(now))} value={date} onChange={e=>{setDate(e.target.value);setFeedback('')}}/></label><label>Período<select value={period} onChange={e=>{setPeriod(e.target.value);setFeedback('')}}><option value="3">3 horas</option><option value="12">Pernoite · 12 horas</option></select></label></div>
          <label>Horário de entrada<input type="time" required value={time} onChange={e=>{setTime(e.target.value);setFeedback('')}}/></label>
          <div className="suite-time-options" aria-label="Sugestões de horários">{['10:00','14:00','18:00','20:00','22:00'].map(hour=><button key={hour} type="button" disabled={!!availability(hour)} aria-pressed={time===hour} title={availability(hour)||'Disponível'} onClick={()=>{setTime(hour);setFeedback('')}}>{hour}</button>)}</div>
          <p className={`suite-availability ${unavailable?'unavailable':''}`} role="status">{unavailable||'Disponível para o período selecionado'}</p>
          <label>Nome fictício<input required minLength={2} autoComplete="name" placeholder="Como podemos chamar você?" value={name} onChange={e=>setName(e.target.value)}/></label><label>E-mail fictício<input type="email" required autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <div className="suite-total"><span>Total da reserva</span><strong>{money(rate)}</strong></div>{feedback&&<p role="alert" className="pub-feedback">{feedback}</p>}
          <button disabled={!!unavailable} className="pub-dark-button" type="submit">Confirmar reserva <ArrowRight size={17}/></button><p className="suite-small">Demonstração local. Sem cobrança ou envio de mensagens.</p>
        </form>}
      </aside></div>
    </main>
    {!confirmed&&<div className="suite-mobile-book"><div><strong>{money(rate)}</strong><span> / {period==='12'?'pernoite':'3 horas'}</span></div><button className="pub-dark-button" onClick={focusBooking}>Reservar <ArrowRight size={16}/></button></div>}
  </>;
}
