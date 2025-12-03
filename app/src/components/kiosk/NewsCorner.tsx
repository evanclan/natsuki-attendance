'use client'

import { useEffect, useState } from 'react'
import { getNews, NewsItem } from '@/app/actions/news'
import { Megaphone } from 'lucide-react'

export function NewsCorner() {
    const [news, setNews] = useState<NewsItem[]>([])

    useEffect(() => {
        loadNews()
    }, [])

    async function loadNews() {
        try {
            const data = await getNews('student')
            setNews(data)
        } catch (error) {
            console.error('Failed to load news', error)
        }
    }

    if (news.length === 0) return null

    const NewsContent = ({ suffix = '' }: { suffix?: string }) => (
        <>
            {news.map((item) => (
                <div key={`${item.id}${suffix}`} className="flex items-center mr-12">
                    <span className="text-sm font-bold text-gray-800 mr-3">
                        {item.title}
                    </span>
                    <span className="text-sm text-gray-600 font-medium">
                        {item.description}
                    </span>
                    <span className="ml-12 text-orange-300">•</span>
                </div>
            ))}
        </>
    )

    return (
        <div className="mx-4 mb-6 relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-100/80 to-yellow-100/80 backdrop-blur-md border border-orange-200/50 shadow-sm">
            <div className="flex items-center py-3 px-4">
                <div className="flex-shrink-0 flex items-center gap-2 mr-4 text-orange-600 border-r border-orange-200 pr-4 z-10 bg-inherit">
                    <Megaphone className="h-5 w-5 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">News</span>
                </div>

                <div className="flex-1 overflow-hidden relative h-6">
                    <div className="animate-ticker flex items-center h-full w-max">
                        <NewsContent />
                        <NewsContent suffix="-duplicate" />
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker {
                    animation: ticker 40s linear infinite;
                }
                /* Pause animation on hover for readability */
                .animate-ticker:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    )
}
