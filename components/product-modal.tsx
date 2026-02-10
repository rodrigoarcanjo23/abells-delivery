"use client"

import { useState } from "react" // Removi o useEffect que dava erro
import Image from "next/image"
import { Product } from "@/types"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Minus, Plus } from "lucide-react"

// 1. CORREÇÃO DO ANY: Criamos a "Identidade" do Item de Pedido
export interface OrderItem {
  product: Product
  quantity: number
  selectedModifiers: Record<string, string[]>
  totalPrice: number
}

interface ProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: OrderItem) => void // Agora o TypeScript sabe o que entra aqui!
}

export function ProductModal({ product, isOpen, onClose, onAddToCart }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({})
  
  // Hook para detectar se é Desktop
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // ⚠️ REMOVI O useEffect DAQUI!
  // O reset do formulário agora será feito de forma automática pelo React
  // usando a propriedade "key" lá no page.tsx. É mais limpo e sem erros.

  if (!product) return null

  // 2. CÁLCULO DINÂMICO DE PREÇO
  let modifiersPrice = 0
  Object.keys(selectedModifiers).forEach(groupId => {
    const group = product.modifierGroups?.find(g => g.id === groupId)
    const selectedIds = selectedModifiers[groupId] || []
    
    selectedIds.forEach(modId => {
      const modifier = group?.modifiers.find(m => m.id === modId)
      if (modifier) modifiersPrice += modifier.price
    })
  })

  const finalPrice = (product.price + modifiersPrice) * quantity

  const formatPrice = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleSelection = (groupId: string, modId: string, isSingle: boolean) => {
    setSelectedModifiers(prev => {
      const current = prev[groupId] || []
      
      if (isSingle) {
        return { ...prev, [groupId]: [modId] }
      } else {
        const exists = current.includes(modId)
        return { 
          ...prev, 
          [groupId]: exists ? current.filter(id => id !== modId) : [...current, modId] 
        }
      }
    })
  }

  const handleFinish = () => {
    onAddToCart({
      product,
      quantity,
      selectedModifiers,
      totalPrice: finalPrice
    })
    onClose()
  }

  // --- CONTEÚDO VISUAL (Sem alterações na lógica, só visual) ---
  const Content = (
    <div className={isDesktop ? "mt-0" : "px-4"}>
      <div className={`relative w-full bg-slate-100 shrink-0 rounded-md overflow-hidden mb-4 ${isDesktop ? 'h-40' : 'h-52'}`}>
        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
      </div>

      <div className="space-y-6 pb-4">
        {product.modifierGroups?.map(group => (
          <div key={group.id}>
            <div className="flex justify-between items-center bg-slate-50 p-2 -mx-2 mb-2 rounded">
              <h4 className="font-semibold text-sm text-slate-800">{group.name}</h4>
              <span className="text-xs text-slate-500 font-medium bg-slate-200 px-2 py-1 rounded">
                {group.minSelection > 0 ? 'Obrigatório' : 'Opcional'}
              </span>
            </div>

            {group.maxSelection === 1 ? (
              <RadioGroup onValueChange={(val) => handleSelection(group.id, val, true)}>
                {group.modifiers.map(mod => (
                  <div key={mod.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value={mod.id} id={mod.id} />
                      <Label htmlFor={mod.id} className="text-sm font-medium">{mod.name}</Label>
                    </div>
                    {mod.price > 0 && <span className="text-sm text-slate-600">+{formatPrice(mod.price)}</span>}
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                {group.modifiers.map(mod => (
                  <div key={mod.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <Checkbox id={mod.id} onCheckedChange={() => handleSelection(group.id, mod.id, false)} />
                      <Label htmlFor={mod.id} className="text-sm font-medium">{mod.name}</Label>
                    </div>
                    {mod.price > 0 && <span className="text-sm text-slate-600">+{formatPrice(mod.price)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="h-20" />
    </div>
  )

  const FooterContent = (
    <div className="flex flex-row items-center justify-between gap-4 w-full">
        <div className="flex items-center border rounded-md bg-white">
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-semibold">{quantity}</span>
          <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setQuantity(quantity + 1)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12 text-md font-semibold" onClick={handleFinish}>
          <span className="mr-2">Adicionar</span>
          <span>{formatPrice(finalPrice)}</span>
        </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>{product.description}</DialogDescription>
          </DialogHeader>
          {Content}
          <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
            {FooterContent}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{product.name}</DrawerTitle>
          <DrawerDescription>{product.description}</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="overflow-y-auto">
          {Content}
        </ScrollArea>
        <DrawerFooter className="pt-2 pb-8 border-t bg-white">
           {FooterContent}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}