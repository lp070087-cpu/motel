import Image from 'next/image';
import metadata from '../lib/photo-metadata.json';
import type { CSSProperties } from 'react';

type Props = {src:string;alt:string;sizes:string;priority?:boolean;loading?:'lazy'|'eager';className?:string;nativeSize?:boolean};
export default function Photo({src,alt,sizes,priority=false,loading,className,nativeSize=false}:Props) {
 const dimensions=(metadata as Record<string,{width:number;height:number}>)[src]??{width:1000,height:667};
 const small=dimensions.width<600;
 const style:CSSProperties|undefined=nativeSize&&small?{width:'auto',height:'auto',maxWidth:'100%',maxHeight:dimensions.height,objectFit:'contain'}:undefined;
 return <Image src={src} alt={alt} width={dimensions.width} height={dimensions.height}
   sizes={sizes} quality={85} priority={priority} loading={priority?undefined:loading}
   className={className} style={style}/>;
}
