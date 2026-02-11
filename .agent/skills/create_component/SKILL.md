---
name: create_component
description: Cria um novo componente React seguindo os padrões do projeto Benfit
---

# Skill: Criar Componente React

Use esta skill quando precisar criar um novo componente visual.

## Padrões do Projeto
- **Framework**: React + Vite
- **Estilização**: CSS Modules ou CSS padrão
- **Ícones**: Use `lucide-react` ou `phosphor-react` (verifique o package.json).
- **Estrutura**:
  - Componente funcional exportado como default.
  - Props tipadas (se estiver usando JSDoc/PropTypes) ou desestruturadas claramente.

## Passos para Criação 

1. **Verificar Localização**:
   - Componentes reutilizáveis vão em `src/components/`.
   - Páginas vão em `src/pages/`.
   - Layouts vão em `src/layouts/`.

2. **Criar Arquivo**:
   - Nome em PascalCase (ex: `MeuComponente.jsx`).

3. **Template**:
   ```jsx
   import React from 'react';
   import './MeuComponente.css'; // Se houver estilos específicos

   const MeuComponente = ({ title, children }) => {
     return (
       <div className="meu-componente">
         {title && <h2>{title}</h2>}
         {children}
       </div>
     );
   };

   export default MeuComponente;
   ```

4. **Adicionar Estilos**:
   - Crie o arquivo `.css` correspondente se necessário.
   - Use variáveis CSS do projeto para cores (ex: `var(--color-primary)`).
