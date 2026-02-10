import { supabase } from "./supabase"
import { OrderItem } from "@/components/product-modal"

// Define o formato dos dados que vamos salvar
interface CreateOrderParams {
  customerName: string
  customerPhone: string
  address: string
  total: number
  deliveryType: 'delivery' | 'pickup'
  paymentMethod: string
  items: OrderItem[]
}

export async function createOrder(data: CreateOrderParams) {
  // 1. Salva o Pedido na tabela 'orders'
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([
      {
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        delivery_address: data.address,
        total: data.total,
        delivery_type: data.deliveryType,
        payment_method: data.paymentMethod,
        status: 'pending' // Começa sempre como pendente
      }
    ])
    .select()
    .single()

  if (orderError) {
    console.error("Erro ao criar pedido:", orderError)
    throw orderError
  }

  // 2. Salva os Itens na tabela 'order_items'
  const itemsToInsert = data.items.map(item => ({
    order_id: order.id,
    product_name: item.product.name,
    unit_price: item.product.price,
    quantity: item.quantity,
    // Cria um resumo das opções: "Ao Ponto, Bacon Extra"
    options_summary: Object.values(item.selectedModifiers)
        .flat()
        .map(modId => {
            // Tenta encontrar o nome do modificador dentro dos grupos do produto
            const group = item.product.modifierGroups?.find(g => g.modifiers.some(m => m.id === modId))
            const mod = group?.modifiers.find(m => m.id === modId)
            return mod ? mod.name : modId
        })
        .join(", ")
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsToInsert)

  if (itemsError) {
    console.error("Erro ao salvar itens:", itemsError)
    throw itemsError
  }

  return order
}