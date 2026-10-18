import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'MOTEL — A arte de gerir experiências', description: 'Ecossistema demonstrativo de gestão e reservas para dez unidades fictícias.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }

import '../components/Modules.css';

import '../components/Refinements.css';

import '../components/Photo.css';
