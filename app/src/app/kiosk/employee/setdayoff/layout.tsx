import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Set Preferred Day Off | 希望休設定',
    description: 'Submit your preferred rest days for the next month. Deadline: 21st of the month. | 来月の希望休を提出してください。締め切り: 毎月21日',
    openGraph: {
        title: 'Set Preferred Day Off | 希望休設定',
        description: 'Submit your preferred rest days. Deadline: 21st. | 希望休を提出してください。締め切り: 21日',
        images: [
            {
                url: '/opengraph-image.png',
                width: 1200,
                height: 630,
                alt: 'Set Preferred Day Off',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Set Preferred Day Off | 希望休設定',
        description: 'Submit your preferred rest days. Deadline: 21st.',
    },
}

export default function SetDayOffLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
