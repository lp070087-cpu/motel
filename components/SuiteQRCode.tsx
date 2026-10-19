'use client';
import {useEffect,useState} from 'react';
import {suiteEntryPath} from '../lib/indoor-guide';
import './OperationalIntegration.css';
export default function SuiteQRCode({roomId,number}:{roomId:string;number:string}){
 const [url,setUrl]=useState('');const [image,setImage]=useState('');const [error,setError]=useState('');
 useEffect(()=>{let active=true;const link=window.location.origin+suiteEntryPath(roomId);setUrl(link);
  import('qrcode').then(module=>module.default.toDataURL(link,{width:240,margin:4,errorCorrectionLevel:'M',color:{dark:'#20251fff',light:'#ffffffff'}}))
   .then(data=>{if(active)setImage(data)}).catch(()=>{if(active)setError('Não foi possível gerar o QR Code neste dispositivo. Use o link abaixo.');});
  return()=>{active=false;};
 },[roomId]);
 return <section className="oi-qr" aria-label={'QR Code fixo da suíte '+number}><div><span className="eyebrow">ACESSO DIGITAL DA SUÍTE</span><h3>Bem-vindo à suíte {number}</h3><p>O código identifica esta suíte. O acesso à hospedagem exige o código temporário fornecido pela recepção.</p></div>{image&&<img src={image} width={180} height={180} alt={'QR Code para a página de acesso da suíte '+number}/>}<a href={url||suiteEntryPath(roomId)} target="_blank" rel="noreferrer">Abrir página da suíte</a>{error&&<p role="status">{error}</p>}<small>Ao escanear em outro aparelho, a simulação não terá a hospedagem local deste navegador. Acesso entre dispositivos exige backend compartilhado.</small></section>;
}
