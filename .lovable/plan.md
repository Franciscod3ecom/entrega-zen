
# Plano: Corrigir Scanner para Ocupar Tela Inteira

## Problema Identificado

Na imagem podemos ver claramente:
- O video da camera esta restrito a uma faixa no topo (16:9)
- Ha um grande espaco vazio preto abaixo
- O quadrado de referencia esta no meio da tela preta, nao sobre o video
- Ha dois quadrados de referencia (um do BarcodeScanner e outro da pagina pai)

## Causa Raiz

**Arquivo:** `src/components/BarcodeScanner.tsx` (linha 141)

```tsx
<div className="relative w-full" style={{ aspectRatio: '16/9' }}>
```

O `aspectRatio: '16/9'` forca o container do video a ter proporcao fixa, impedindo que ocupe toda a tela.

---

## Solucao

### 1. Modificar BarcodeScanner.tsx

Adicionar prop `fullscreen` para controlar o layout:

| Alteracao | Descricao |
|-----------|-----------|
| Linha 4-7 | Adicionar `fullscreen?: boolean` na interface |
| Linha 140-161 | Container e video condicionais - quando fullscreen, usar `absolute inset-0 w-full h-full` |
| Linhas 149-159 | Remover overlay/guia interno quando fullscreen (a pagina pai ja tem) |

**Codigo final:**

```tsx
interface BarcodeScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
  fullscreen?: boolean;
}

// No return:
return (
  <div 
    className={fullscreen ? "absolute inset-0" : "relative w-full"} 
    style={fullscreen ? undefined : { aspectRatio: '16/9' }}
  >
    <video
      ref={videoRef}
      className={cn(
        "object-cover",
        fullscreen 
          ? "absolute inset-0 w-full h-full" 
          : "w-full h-full rounded-lg"
      )}
      playsInline
      muted
    />
    
    {/* Overlay apenas no modo nao-fullscreen */}
    {!fullscreen && (
      <>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-primary rounded-lg w-48 h-48 opacity-80" />
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs">
            Posicione o QR no centro
          </span>
        </div>
      </>
    )}
  </div>
);
```

---

### 2. Atualizar Bipagem.tsx (linha 140)

Passar `fullscreen={true}`:

```tsx
<BarcodeScanner 
  onScan={handleScanResult} 
  isActive={isScanning} 
  fullscreen={true}
/>
```

---

### 3. Atualizar motorista/Bipar.tsx (linha ~89)

Mesma alteracao:

```tsx
<BarcodeScanner 
  onScan={handleScanResult} 
  isActive={isScanning} 
  fullscreen={true}
/>
```

---

## Arquivos a Modificar

| Arquivo | Linha(s) | Alteracao |
|---------|----------|-----------|
| `src/components/BarcodeScanner.tsx` | 4-7, 140-161 | Adicionar prop fullscreen + estilos condicionais |
| `src/pages/Bipagem.tsx` | 140 | Adicionar `fullscreen={true}` |
| `src/pages/motorista/Bipar.tsx` | ~89 | Adicionar `fullscreen={true}` |

---

## Resultado Visual Esperado

```text
Antes:                          Depois:
+------------------+            +------------------+
|  [Video 16:9]    |            |                  |
|  [Quadrado]      |            |  Video Camera    |
+------------------+            |                  |
|                  |            |    +---------+   |
|   Area Preta     |            |    | Quadrado|   |
|   [Quadrado]     |  ====>     |    | Central |   |
|                  |            |                  |
|                  |            |                  |
+------------------+            +------------------+
|   Botoes         |            |   Botoes         |
+------------------+            +------------------+
```

O video da camera ocupara 100% da tela com o quadrado de referencia centralizado sobre a imagem ao vivo.
