/** Local demonstration only. Production must replace this with server-side authentication. */
export async function demoCredentialDigest(email:string,personalCode:string) {
 if(personalCode.length<6||personalCode.length>80)throw new Error('Use um código pessoal demonstrativo de 6 a 80 caracteres.');
 const bytes=new TextEncoder().encode('motel-demo:'+email.trim().toLowerCase()+':'+personalCode);
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}
