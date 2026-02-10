"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { OrderItem } from "@/components/product-modal"
import { Loader2 } from "lucide-react"
import { createOrder } from "@/lib/orders" // Importamos a função que criamos acima

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cartItems: OrderItem[]
  cartTotal: number
}

export function CheckoutDialog({ open, onOpenChange, cartItems, cartTotal }: CheckoutDialogProps) {
  const [loading, setLoading] = useState(false)
  
  // Dados do Cliente
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  
  // Dados de Entrega
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [cep, setCep] = useState("")
  const [address, setAddress] = useState("")
  const [number, setNumber] = useState("")
  const [complement, setComplement] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("pix")

  // Taxa de Entrega Fixa (Para este exemplo)
  const deliveryFee = deliveryMethod === 'delivery' ? 5.00 : 0.00
  const finalTotal = cartTotal + deliveryFee

  // Busca CEP automática (ViaCEP)
  const handleFetchCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "")
    if (cleanCep.length === 8) {
      setLoading(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setAddress(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`)
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleFinishOrder = async () => {
    if (!name || !phone) {
        alert("Por favor, preencha nome e telefone.")
        return
    }

    if (deliveryMethod === 'delivery' && (!address || !number)) {
        alert("Por favor, preencha o endereço completo.")
        return
    }

    setLoading(true)

    try {
        // 1. Monta o endereço completo
        const fullAddress = deliveryMethod === 'delivery' 
            ? `${address}, Nº ${number} ${complement ? `(${complement})` : ''}`
            : 'Retirada na Loja'

        // 2. SALVA NO SUPABASE
        await createOrder({
            customerName: name,
            customerPhone: phone,
            address: fullAddress,
            total: finalTotal,
            deliveryType: deliveryMethod,
            paymentMethod: paymentMethod,
            items: cartItems
        })

        // 3. Monta o texto do WhatsApp
        let message = `*NOVO PEDIDO - ABELL'S HAMBURGUERIA* 🍔\n\n`
        message += `*Cliente:* ${name}\n`
        message += `*Telefone:* ${phone}\n`
        message += `*Tipo:* ${deliveryMethod === 'delivery' ? 'Entrega 🛵' : 'Retirada 🏪'}\n`
        
        if (deliveryMethod === 'delivery') {
            message += `*Endereço:* ${fullAddress}\n`
        }
        
        message += `\n*---------------- PEDIDO ----------------*\n`
        
        cartItems.forEach(item => {
            message += `\n📦 *${item.quantity}x ${item.product.name}*\n`
            // Lista adicionais
            Object.entries(item.selectedModifiers).forEach(([groupId, modIds]) => {
                const group = item.product.modifierGroups?.find(g => g.id === groupId)
                modIds.forEach(modId => {
                   const mod = group?.modifiers.find(m => m.id === modId)
                   if (mod) message += `   + ${mod.name}\n`
                })
            })
        })
        
        message += `\n*---------------- TOTAIS ----------------*\n`
        message += `Subtotal: R$ ${cartTotal.toFixed(2)}\n`
        message += `Entrega: R$ ${deliveryFee.toFixed(2)}\n`
        message += `*TOTAL A PAGAR: R$ ${finalTotal.toFixed(2)}*\n`
        message += `Pagamento: *${paymentMethod.toUpperCase()}*\n`
        message += `\n_Pedido enviado pelo App_`

        // 4. Abre o WhatsApp
        // ⚠️ IMPORTANTE: Troque pelo número do dono da hamburgueria (formato internacional sem +)
        const phoneStore = "5585999999999" 
        const encodedMessage = encodeURIComponent(message)
        const whatsappUrl = `https://wa.me/${phoneStore}?text=${encodedMessage}`
        
        window.open(whatsappUrl, '_blank')
        
        // 5. Fecha o modal
        onOpenChange(false)

    } catch (error) {
        alert("Ocorreu um erro ao salvar o pedido. Tente novamente.")
        console.error(error)
    } finally {
        setLoading(false)
    }
  }

  const formatPrice = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Pedido</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          
          {/* SELEÇÃO DE TIPO DE ENTREGA */}
          <div className="flex flex-col gap-2">
             <Label className="font-semibold">Como deseja receber?</Label>
             <RadioGroup 
                value={deliveryMethod} 
                onValueChange={(v: 'delivery' | 'pickup') => setDeliveryMethod(v)}
                className="flex gap-4"
             >
                <div className={`flex items-center space-x-2 border p-3 rounded-md w-full cursor-pointer transition-colors ${deliveryMethod === 'delivery' ? 'bg-slate-50 border-slate-400' : ''}`}>
                  <RadioGroupItem value="delivery" id="r1" />
                  <Label htmlFor="r1" className="cursor-pointer w-full">Entrega (+R$ 5,00)</Label>
                </div>
                <div className={`flex items-center space-x-2 border p-3 rounded-md w-full cursor-pointer transition-colors ${deliveryMethod === 'pickup' ? 'bg-slate-50 border-slate-400' : ''}`}>
                  <RadioGroupItem value="pickup" id="r2" />
                  <Label htmlFor="r2" className="cursor-pointer w-full">Retirada (Grátis)</Label>
                </div>
             </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Seu Nome</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Rodrigo" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">WhatsApp / Celular</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          {deliveryMethod === 'delivery' && (
            <div className="space-y-4 border-t pt-4 mt-2">
              <p className="text-sm font-semibold text-slate-700">Endereço de Entrega</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 flex flex-col gap-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input 
                    id="cep" 
                    value={cep} 
                    onChange={e => {
                        setCep(e.target.value)
                        if(e.target.value.length >= 8) handleFetchCep(e.target.value)
                    }} 
                    placeholder="00000-000" 
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-2 relative">
                  <Label htmlFor="address">Rua / Av.</Label>
                  <Input id="address" value={address} onChange={e => setAddress(e.target.value)} disabled={loading} />
                  {loading && <Loader2 className="absolute right-2 top-8 animate-spin h-4 w-4 text-slate-500" />}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 flex flex-col gap-2">
                   <Label htmlFor="number">Nº</Label>
                   <Input id="number" value={number} onChange={e => setNumber(e.target.value)} />
                </div>
                <div className="col-span-3 flex flex-col gap-2">
                   <Label htmlFor="comp">Complemento (Opcional)</Label>
                   <Input id="comp" value={complement} onChange={e => setComplement(e.target.value)} placeholder="Apto 101, Casa B" />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-4 mt-2">
             <Label className="font-semibold">Pagamento na entrega/retirada:</Label>
             <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
             >
                <option value="pix">PIX (Chave ou QR Code)</option>
                <option value="credito">Cartão de Crédito</option>
                <option value="debito">Cartão de Débito</option>
                <option value="dinheiro">Dinheiro (Precisa de troco?)</option>
             </select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4 bg-slate-50 -mx-6 px-6 pb-2">
            <div className="flex justify-between items-center w-full mb-4 sm:mb-0 text-sm">
                <span className="text-slate-500">Total com entrega:</span>
                <span className="font-bold text-lg text-slate-900">{formatPrice(finalTotal)}</span>
            </div>
            <Button 
                onClick={handleFinishOrder} 
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-white font-bold h-12"
                disabled={loading || !name || !phone || (deliveryMethod === 'delivery' && !address)}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                    </>
                ) : (
                    'Enviar Pedido no WhatsApp 📲'
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}