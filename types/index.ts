// Define a estrutura de uma opção (ex: "Bacon Extra")
export interface Modifier {
  id: string
  name: string
  price: number
}

// Define a estrutura de um grupo de opções (ex: "Adicionais", "Ponto da Carne")
export interface ModifierGroup {
  id: string
  name: string
  minSelection: number
  maxSelection: number
  modifiers: Modifier[]
}

// Define o Produto completo
export interface Product {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string
  isPopular: boolean
  category: string
  // Usamos ModifierGroup[] em vez de 'any'
  modifierGroups?: ModifierGroup[] 
  // Caso venha direto do banco com o nome 'ingredients'
  ingredients?: ModifierGroup[] 
}