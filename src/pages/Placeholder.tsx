// Pantalla placeholder para módulos aún no construidos
import { Construction } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../components/layout/Shell'

export default function Placeholder({ titulo }: { titulo: string }) {
  return (
    <Shell>
      <PageContainer>
        <PageHeader title={titulo} />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Construction size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-500">En construcción</p>
          <p className="text-sm text-gray-400 mt-1">Este módulo se construirá en el siguiente sprint.</p>
        </div>
      </PageContainer>
    </Shell>
  )
}
