import generatePageMetadata from '@/seo';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = generatePageMetadata({ 
    title: 'Home', 
    description: 'Explore posts on page 1', 
    url: '/page'
});

export default function Page() {
    redirect('/page/1');
}
