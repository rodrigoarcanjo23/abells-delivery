"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OrderItem } from "@/components/product-modal"
import { ShoppingBag, X } from "lucide-react"

interface CartSidebarProps {
  items: OrderItem[]
  onRemoveItem: (index: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckout: () => void // <--- Nova prop para abrir o Checkout
}

export function CartSidebar({ items, onRemoveItem, open, onOpenChange, onCheckout }: CartSidebarProps) {
  
  // Calcula o Total da Sacola
  const cartTotal = items.reduce((total, item) => total + item.totalPrice, 0)

  const formatPrice = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-slate-50">
        <SheetHeader className="text-left px-1">
          <SheetTitle>Sua Sacola ({items.length})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ShoppingBag className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Sua sacola está vazia</p>
            <p className="text-sm">Adicione itens deliciosos para começar.</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6 my-4">
            <div className="space-y-4 pr-2">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                  {/* Cabeçalho do Item */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center bg-slate-100 text-slate-700 font-bold text-xs h-6 w-6 rounded-full">
                            {item.quantity}
                        </span>
                        <span className="font-semibold text-slate-900 line-clamp-1">
                            {item.product.name}
                        </span>
                    </div>
                    <span className="font-bold text-slate-700 whitespace-nowrap ml-2">
                      {formatPrice(item.totalPrice)}
                    </span>
                  </div>

                  {/* Lista de Adicionais (Melhorada para mostrar Nomes) */}
                  <div className="text-xs text-slate-500 mb-3 pl-8">
                    {Object.entries(item.selectedModifiers).map(([groupId, modIds]) => {
                        // Busca o nome do grupo e dos modificadores dentro do produto original
                        const group = item.product.modifierGroups?.find(g => g.id === groupId)
                        
                        if (!group || modIds.length === 0) return null

                        return (
                            <div key={groupId} className="mb-1">
                                <span className="font-medium text-slate-600">{group.name}: </span>
                                <span>
                                    {modIds.map(modId => {
                                        const mod = group.modifiers.find(m => m.id === modId)
                                        return mod?.name
                                    }).join(", ")}
                                </span>
                            </div>
                        )
                    })}
                  </div>

                  <Separator className="my-2" />

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="self-end h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onRemoveItem(index)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remover Item
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Rodapé da Sacola */}
        {items.length > 0 && (
          <SheetFooter className="mt-auto border-t pt-4 bg-white -mx-6 px-6 pb-6">
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-lg font-bold text-slate-900">{formatPrice(cartTotal)}</span>
              </div>
              
              <Button 
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-full shadow-md shadow-green-200"
                onClick={onCheckout}
              >
                Finalizar Pedido
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}