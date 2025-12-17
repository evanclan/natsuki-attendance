import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLegends } from './actions'
import { LegendManager } from '@/components/admin/LegendManager'

export default async function LegendsPage() {
    const result = await getLegends()

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/settings">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Settings
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold">Legend Creation</h1>
            </div>

            <LegendManager initialLegends={result.success && result.data ? result.data : []} />
        </div>
    )
}
