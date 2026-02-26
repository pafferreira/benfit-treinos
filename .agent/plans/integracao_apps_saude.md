# Integração com Dispositivos e Apps de Saúde (Hardware Esportivo)

O objetivo desta integração é expandir as capacidades do Benfit permitindo que ele "escute" dados capturados por balanças de bioimpedância e relógios inteligentes (Garmin, Galaxy Watch, Apple Watch, Polar, etc.).

A melhor e mais escalável prática do mercado não é integrar com a API proprietária de cada hardware separadamente, mas sim conectar o aplicativo aos **Agregadores de Saúde Nativos** dos Smarthphones.

## 1. Arquitetura e Tecnologias Sugeridas

### Abordagem Nativa (HealthKit / Health Connect)
Qualquer smartwatch moderno (como Garmin ou Samsung) já possui sincronização oficial com a central de saúde do smartphone do usuário. 
Se conectarmos o Benfit a essa central, herdaremos os dados de *todos* os relógios que o usuário possuir, tudo de graça.

*   **iOS (iPhone):** **Apple HealthKit**. Centraliza passos, calorias, treinos da Apple e balanças integradas.
*   **Android:** **Health Connect (Substituto do Google Fit)**. Nova API nativa do Android que centraliza Samsung Health, Google Fit, Garmin Connect e Strava.

## 2. Fluxo de Funcionalidades (Fases)

### Fase 1: Coleta de Métricas Biométricas (Balanças Inteligentes)
*   **Objetivo:** Eliminar o input manual de peso no aplicativo.
*   **Dados Alvo:** Peso corporal, Percentual de Gordura, Massa Magra.
*   **Fluxo de Usuário:**
    1. O usuário entra em "Configurações > Sincronização".
    2. Autoriza a leitura do Apple Health ou Health Connect.
    3. Quando o usuário sobe em sua balança Wi-Fi/Bluetooth (ex: Xiaomi, Renpho, Omron), ela joga o dado para a central de saúde.
    4. Ao abrir o Benfit, o app busca o peso mais atualizado do HealthKit silenciosamente e o salva no Supabase (`b_user_metrics`), gerando os gráficos de evolução de forma automática.

### Fase 2: Rastreamento Calórico e Atividades (Relógios Inteligentes)
*   **Objetivo:** Complementar os cálculos de gasto diário de energia e capturar corridas/pedaladas feitas "fora" do ecossistema de treinos do Benfit.
*   **Dados Alvo:** Treinos Registrados (Duração, Calorias e Tipo), Calorias Ativas Diárias, Total de Passos.
*   **Fluxo de Usuário:**
    1. Se o usuário correu 5km na rua usando um Relógio Garmin, o Garmin transfere automaticamente a corrida para o Health Connect.
    2. O Benfit faria a leitura desta corrida e a exibiria na "Linha do Tempo" (Activity History) com uma tag diferenciada: `🏃‍♂️ Sincronizado: Corrida Garmin`.
    3. As calorias queimadas nesse treino seriam somadas ao total do dia no gráfico do *Dashboard Principal*.

## 3. Especificações e Requisitos Técnicos

> [!WARNING]
> Para o Benfit acessar os sensores e dados centrais de saúde de um celular (Apple Health ou Health Connect), é mandatório o uso de chamadas de API nativas, o que tem restrições em ambientes 100% *Web/Navegador/PWA*.
> Se o Benfit for apenas um *site* (PWA via Safari/Chrome), não teremos acesso nativo às centrais sem um app instalável.

Dessa forma, a implementação depende do modelo de distribuição do Benfit:

### Cenário A: Aplicativo Híbrido (App Store / Google Play)
Se a intenção for compacotar este projeto React atual em um aplicativo instalável nativamente (usando **CapacitorJS** ou migrando para React Native):
*   Usaremos o plugin Capacitor para o **HealthKit** (iOS) e outro para o **Health Connect** (Android).
*   É o caminho mais fácil, direto e gratuito para importar treinos e balanças.

### Cenário B: Aplicativo 100% Web (PWA no Browser)
Se o sistema for permanecer hospedado na web sem ir pras lojas de aplicativos:
*   Teremos que integrar via S2S (Servidor-para-Servidor) usando **APIs em Nuvem**.
*   **Para Treinos:** Integração com o OAuth da API do **Strava** (já que usuários mandam treinos do Garmin para o Strava, usaríamos o Strava como ponte) ou implantação do **REST API do Google Fit**.
*   **Para Balanças:** Exigirá integração com as APIs de nuvem próprias das marcas (ex: habilitar login com conta Fitbit ou Withings Cloud API), o que tornaria mais segmentado.

## Resumo de Custos e Obrigações (PWA vs Native App)

Como a principal arquitetura de Sincronia Pessoal (HealthConnect / HealthKit) obriga o uso de APIs exclusivas do sistema do aparelho (algo que abas do Chrome ou Safari sozinhas não alcançam com a profundidade e estabilidade exigidas para background sync), é vital entender o custo e o peso logístico para transformar o atual repositório Benfit num App de Loja oficial.

### Opção 1: Transformação em App Nativo Instalável (Ex: Capacitor)

**Vantagens:**
* Acesso imediato, robusto e gratuito ao HealthKit (Apple) e Health Connect (Android), centralizando todos os treinos do usuário em um lugar só (relógio, balança, corridas avulsas).

**Custos & Obrigações Burocráticas Padrões:**
* **Ecossistema Apple (iOS/App Store)**
  * **Taxa Anual:** $99 dólares (± R$ 500/ano). Sem renovar a licença, o app some da loja e recursos dos usuários param.
  * **Obrigatoriedade Técnica:** É absolutamente impossível empacotar, assinar (certificados) e mandar atualizações para a App Store sem possuir um computador físico da Apple (um Mac) operando o software Xcode.
  * **Burocracia de Layout:** A Apple tem regras terríveis de rejeição de UI/UX e funcionalidade mínima e exigência obrigatória de o app funcionar liso, além da "Sign In with Apple" sob certas circunstâncias se usar Google Auth.

* **Ecossistema Android (Google Play Store)**
  * **Taxa Única:** $25 dólares (± R$ 130 pago apenas uma vez vida toda) para abrir a conta.
  * **Obrigatoriedade de Teste:** O novo formato rigoroso da Google exige que **20 usuários diferentes testem ativamente o app por 14 dias contínuos** antes que aceitem publicá-lo publicamente, o que encarece o fluxo de teste e atrasa os laçamentos.
  * Qualquer PC compila e envia o pacote.

* **Custos Operacionais Invisíveis:** Você e a equipe gastarão de 2 a 3x mais tempo mantendo atualizações de plugins nativos da Store do que focando exclusivamente nas funcionalidades da aplicação web de fato.

---

### Opção 2: Manutenção Estrita Web Otimizada (PWA) 

Para manter o "Zero Burocracia" e isenção total das garras pesadas da Apple/Google de taxas anuais de desenvolvedor e revisões que atrasam o projeto, permanecemos só no formato de navegação PWA Web com React.

Neste caminho de restrição da via "Saúde Nativa" do SO:

*   **Não podemos** usar o agregador mágico e centralizador do "Apple Health" do iPhone. As abas do navegador têm barreiras gigantes de privacidade que banem este tipo de sincronização de saúde nativo do sistema para PWA.
*   **A Rota Alternativa de Sincronia de Treinos Web (S2S):** O Benfit passa então, através do banco de dados na web, a realizar Autenticações (OAuth "Conectar a...") pontuais com Plataformas baseadas em Nuvem.
    * A melhor delas: Usaremos a robusta **API Web da plataforma STRAVA** como agregadora global nas nuves. Se o usuário vai correr e tem um Garmim ou Galaxy, o relógio já sincrozina os esportes para sua conta Strava por baixo dos panos. A nossa API faria uma requisição diária e leria os eventos deste backend do Strava Web pra gerar o painel no Benfit sem necessidade de plugar nos chips físicos do telefone dele. 

## Decisão de Viabilidade para a Etapa 1

Com os desafios elucidados:
Você possui interesse firme no overhead financeiro e logístico de **desenvolver o Benfit formalmente para as Lojas Mobile ($) via ecossistema nativo** e sugar nativamente as plataformas do aparelho e assim centralizar o HealthKit, ou entende que usar a alternativa Nuvem com API PWA como a sincronização via Plataformas (Ex: Strava) atende as premissas?
