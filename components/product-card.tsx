import Image from "next/image"
import { Product } from "@/types" // O @ agora aponta pra raiz
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <Card className="w-full max-w-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 border-none shadow-md bg-white">
      <div className="relative h-48 w-full bg-gray-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
        />
        {product.isPopular && (
          <Badge className="absolute top-2 right-2 bg-yellow-500 hover:bg-yellow-600 text-white">
            Mais Pedido
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{product.name}</h3>
        </div>
        <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-4">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-green-600">
            {formatPrice(product.price)}
          </span>
          <Button 
            size="sm" 
            onClick={() => onAdd(product)}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full px-4"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}