"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Product = {
 id: string;
 name: string;
};

export default function NovoLote() {

 const router = useRouter();

 const [products, setProducts] = useState<Product[]>([]);
 const [productId, setProductId] = useState("");
 const [batchNumber, setBatchNumber] = useState("");
 const [expirationDate, setExpirationDate] = useState("");
 const [quantity, setQuantity] = useState("");

 useEffect(() => {

  async function loadProducts() {

   const { data, error } = await supabase
    .from("products")
    .select("id,name")
    .order("name");

   if (!error && data) {
    setProducts(data);
   }

  }

  loadProducts();

 }, []);

 async function createBatch() {

  if (!productId || !batchNumber || !expirationDate || !quantity) {
   alert("Preencha todos os campos");
   return;
  }

  const { error } = await supabase
   .from("stock_batches")
   .insert([
    {
     product_id: productId,
     batch_number: batchNumber,
     expiration_date: expirationDate,
     quantity: Number(quantity)
    }
   ]);

  if (error) {
   alert("Erro ao salvar lote");
   console.error(error);
   return;
  }

  router.push("/estoque");

 }

 return (

  <div style={{ padding: 40, maxWidth: 500 }}>

   <h1 style={{ fontSize: 26, marginBottom: 20 }}>
    Novo Lote Sanitário
   </h1>

   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

    <select
     value={productId}
     onChange={(e) => setProductId(e.target.value)}
    >
     <option value="">Selecione o produto</option>

     {products.map((p) => (
      <option key={p.id} value={p.id}>
       {p.name}
      </option>
     ))}

    </select>

    <input
     placeholder="Número do lote"
     value={batchNumber}
     onChange={(e) => setBatchNumber(e.target.value)}
    />

    <input
     type="date"
     value={expirationDate}
     onChange={(e) => setExpirationDate(e.target.value)}
    />

    <input
     type="number"
     placeholder="Quantidade"
     value={quantity}
     onChange={(e) => setQuantity(e.target.value)}
    />

    <button
     onClick={createBatch}
     style={{
      background: "#2e7d32",
      color: "white",
      border: "none",
      padding: 12,
      borderRadius: 6,
      cursor: "pointer"
     }}
    >
     Salvar Lote
    </button>

   </div>

  </div>

 );

}