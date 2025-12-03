'use client'

import { useEffect, useState } from 'react'
import { getNews, NewsItem, updateNews } from '@/app/actions/news'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Megaphone, EyeOff } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from 'sonner'

export function NewsCorner() {
    const [news, setNews] = useState<NewsItem | null>(null)

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

    async function handleHide() {
        if (!news) return
        try {
            await updateNews(news.id, { is_active: false })
            toast.success('News hidden')
            setNews(null)
        } catch (error) {
            toast.error('Failed to hide news')
        }
    }

    if (!news) return null

    return (
        <div className="mx-4 mb-4">
            <Card className="bg-white/90 backdrop-blur-sm border-orange-100 shadow-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    <div className="flex flex-row h-24 pl-4 items-center relative group">
                        {/* Image Section */}
                        <div className="w-24 h-24 relative bg-orange-50 flex-shrink-0 flex items-center justify-center rounded-l-lg overflow-hidden">
                            {news.image_url ? (
                                <img
                                    src={news.image_url}
                                    alt={news.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Megaphone className="h-8 w-8 text-orange-300" />
                            )}
                            <div className="absolute top-1 left-1">
                                <Badge className="bg-orange-500/90 hover:bg-orange-600 text-[10px] px-1.5 py-0 h-4 text-white border-none shadow-sm">
                                    NEWS
                                </Badge>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 p-5 flex flex-col justify-center min-w-0 pr-10">
                            <div className="flex justify-between items-start gap-3">
                                <h2 className="text-sm font-bold text-gray-800 mb-1.5 line-clamp-1 leading-tight">
                                    {news.title}
                                </h2>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                                    {new Date(news.display_date).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                {news.description}
                            </p>
                        </div>

                        {/* Hide Button */}
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                onClick={handleHide}
                                title="Hide News"
                            >
                                <EyeOff className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
